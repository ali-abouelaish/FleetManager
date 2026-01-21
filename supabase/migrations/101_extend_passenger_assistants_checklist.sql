-- ====================================================================
-- Migration: Extend Passenger Assistants Table with Complete Checklist Fields
-- ====================================================================
-- Adds all fields from the driver checklist (except driver-specific fields)
-- for comprehensive PA compliance tracking.
-- ====================================================================
-- EXCLUDED FIELDS (driver-only):
-- - taxi_badge_number, taxi_badge_expiry_date (driver only)
-- - driving_license_expiry_date (driver only)
-- - cpc_expiry_date (driver only - CPC is for drivers)
-- - vehicle_insurance_expiry_date (driver only)
-- - mot_expiry_date (driver only)
-- - psv_license (driver only)
-- ====================================================================

-- Add new columns to passenger_assistants table
ALTER TABLE passenger_assistants
ADD COLUMN IF NOT EXISTS first_aid_certificate_expiry_date DATE,
ADD COLUMN IF NOT EXISTS passport_expiry_date DATE,
ADD COLUMN IF NOT EXISTS utility_bill_date DATE,
ADD COLUMN IF NOT EXISTS birth_certificate BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS marriage_certificate BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS photo_taken BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS private_hire_badge BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS paper_licence BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS taxi_plate_photo BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS logbook BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS safeguarding_training_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS safeguarding_training_date DATE,
ADD COLUMN IF NOT EXISTS tas_pats_training_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS tas_pats_training_date DATE,
ADD COLUMN IF NOT EXISTS psa_training_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS psa_training_date DATE,
ADD COLUMN IF NOT EXISTS additional_notes TEXT;

-- Add indexes for date columns (for faster expiry queries)
CREATE INDEX IF NOT EXISTS idx_pa_first_aid_expiry ON passenger_assistants(first_aid_certificate_expiry_date);
CREATE INDEX IF NOT EXISTS idx_pa_passport_expiry ON passenger_assistants(passport_expiry_date);

-- Update the expiry flags function to include new PA certificate fields
CREATE OR REPLACE FUNCTION update_expiry_flags()
RETURNS void AS $$
BEGIN
  -- ======================
  -- VEHICLES OFF ROAD (VOR)
  -- ======================
  
  -- Mark vehicles as VOR if any certificate is expired
  UPDATE vehicles
  SET off_the_road = TRUE
  WHERE (
    (plate_expiry_date IS NOT NULL AND plate_expiry_date < CURRENT_DATE) OR
    (insurance_expiry_date IS NOT NULL AND insurance_expiry_date < CURRENT_DATE) OR
    (mot_date IS NOT NULL AND mot_date < CURRENT_DATE) OR
    (tax_date IS NOT NULL AND tax_date < CURRENT_DATE) OR
    (loler_expiry_date IS NOT NULL AND loler_expiry_date < CURRENT_DATE) OR
    (first_aid_expiry IS NOT NULL AND first_aid_expiry < CURRENT_DATE) OR
    (fire_extinguisher_expiry IS NOT NULL AND fire_extinguisher_expiry < CURRENT_DATE)
  )
  AND off_the_road = FALSE; -- Only update if not already marked

  -- Re-enable vehicles if all certificates are valid or NULL
  UPDATE vehicles
  SET off_the_road = FALSE
  WHERE off_the_road = TRUE
    AND (plate_expiry_date IS NULL OR plate_expiry_date >= CURRENT_DATE)
    AND (insurance_expiry_date IS NULL OR insurance_expiry_date >= CURRENT_DATE)
    AND (mot_date IS NULL OR mot_date >= CURRENT_DATE)
    AND (tax_date IS NULL OR tax_date >= CURRENT_DATE)
    AND (loler_expiry_date IS NULL OR loler_expiry_date >= CURRENT_DATE)
    AND (first_aid_expiry IS NULL OR first_aid_expiry >= CURRENT_DATE)
    AND (fire_extinguisher_expiry IS NULL OR fire_extinguisher_expiry >= CURRENT_DATE);

  -- ======================
  -- EMPLOYEES (Drivers & Passenger Assistants)
  -- ======================
  
  -- Flag employees who have expired certificates (including new PA fields)
  UPDATE employees
  SET can_work = FALSE
  WHERE id IN (
    SELECT DISTINCT e.id
    FROM employees e
    LEFT JOIN drivers d ON d.employee_id = e.id
    LEFT JOIN passenger_assistants pa ON pa.employee_id = e.id
    WHERE (
      -- Driver certificates
      (d.tas_badge_expiry_date IS NOT NULL AND d.tas_badge_expiry_date < CURRENT_DATE) OR
      (d.taxi_badge_expiry_date IS NOT NULL AND d.taxi_badge_expiry_date < CURRENT_DATE) OR
      (d.dbs_expiry_date IS NOT NULL AND d.dbs_expiry_date < CURRENT_DATE) OR
      (d.first_aid_certificate_expiry_date IS NOT NULL AND d.first_aid_certificate_expiry_date < CURRENT_DATE) OR
      (d.passport_expiry_date IS NOT NULL AND d.passport_expiry_date < CURRENT_DATE) OR
      (d.driving_license_expiry_date IS NOT NULL AND d.driving_license_expiry_date < CURRENT_DATE) OR
      (d.cpc_expiry_date IS NOT NULL AND d.cpc_expiry_date < CURRENT_DATE) OR
      (d.vehicle_insurance_expiry_date IS NOT NULL AND d.vehicle_insurance_expiry_date < CURRENT_DATE) OR
      (d.mot_expiry_date IS NOT NULL AND d.mot_expiry_date < CURRENT_DATE) OR
      -- PA certificates (including new fields)
      (pa.tas_badge_expiry_date IS NOT NULL AND pa.tas_badge_expiry_date < CURRENT_DATE) OR
      (pa.dbs_expiry_date IS NOT NULL AND pa.dbs_expiry_date < CURRENT_DATE) OR
      (pa.first_aid_certificate_expiry_date IS NOT NULL AND pa.first_aid_certificate_expiry_date < CURRENT_DATE) OR
      (pa.passport_expiry_date IS NOT NULL AND pa.passport_expiry_date < CURRENT_DATE)
    )
  )
  AND can_work = TRUE; -- Only update if not already flagged

  -- Unflag employees if all their certificates are valid or NULL
  UPDATE employees
  SET can_work = TRUE
  WHERE can_work = FALSE
  AND id IN (
    SELECT DISTINCT e.id
    FROM employees e
    LEFT JOIN drivers d ON d.employee_id = e.id
    LEFT JOIN passenger_assistants pa ON pa.employee_id = e.id
    WHERE (
      (d.employee_id IS NULL OR (
        -- Driver certificates
        (d.tas_badge_expiry_date IS NULL OR d.tas_badge_expiry_date >= CURRENT_DATE) AND
        (d.taxi_badge_expiry_date IS NULL OR d.taxi_badge_expiry_date >= CURRENT_DATE) AND
        (d.dbs_expiry_date IS NULL OR d.dbs_expiry_date >= CURRENT_DATE) AND
        (d.first_aid_certificate_expiry_date IS NULL OR d.first_aid_certificate_expiry_date >= CURRENT_DATE) AND
        (d.passport_expiry_date IS NULL OR d.passport_expiry_date >= CURRENT_DATE) AND
        (d.driving_license_expiry_date IS NULL OR d.driving_license_expiry_date >= CURRENT_DATE) AND
        (d.cpc_expiry_date IS NULL OR d.cpc_expiry_date >= CURRENT_DATE) AND
        (d.vehicle_insurance_expiry_date IS NULL OR d.vehicle_insurance_expiry_date >= CURRENT_DATE) AND
        (d.mot_expiry_date IS NULL OR d.mot_expiry_date >= CURRENT_DATE)
      ))
      AND
      (pa.employee_id IS NULL OR (
        -- PA certificates (including new fields)
        (pa.tas_badge_expiry_date IS NULL OR pa.tas_badge_expiry_date >= CURRENT_DATE) AND
        (pa.dbs_expiry_date IS NULL OR pa.dbs_expiry_date >= CURRENT_DATE) AND
        (pa.first_aid_certificate_expiry_date IS NULL OR pa.first_aid_certificate_expiry_date >= CURRENT_DATE) AND
        (pa.passport_expiry_date IS NULL OR pa.passport_expiry_date >= CURRENT_DATE)
      ))
    )
  );

  RAISE NOTICE 'Expiry flags updated successfully (including extended PA fields)';
END;
$$ LANGUAGE plpgsql;

-- Update the PA expiry trigger to include new fields
CREATE OR REPLACE FUNCTION trigger_update_pa_expiry()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if any expiry date changed
  IF (OLD.tas_badge_expiry_date IS DISTINCT FROM NEW.tas_badge_expiry_date OR
      OLD.dbs_expiry_date IS DISTINCT FROM NEW.dbs_expiry_date OR
      OLD.first_aid_certificate_expiry_date IS DISTINCT FROM NEW.first_aid_certificate_expiry_date OR
      OLD.passport_expiry_date IS DISTINCT FROM NEW.passport_expiry_date) THEN
    
    -- Check if any certificate is expired
    IF (NEW.tas_badge_expiry_date IS NOT NULL AND NEW.tas_badge_expiry_date < CURRENT_DATE) OR
       (NEW.dbs_expiry_date IS NOT NULL AND NEW.dbs_expiry_date < CURRENT_DATE) OR
       (NEW.first_aid_certificate_expiry_date IS NOT NULL AND NEW.first_aid_certificate_expiry_date < CURRENT_DATE) OR
       (NEW.passport_expiry_date IS NOT NULL AND NEW.passport_expiry_date < CURRENT_DATE) THEN
      UPDATE employees SET can_work = FALSE WHERE id = NEW.employee_id;
    ELSE
      -- Check if all certificates valid for this employee
      PERFORM 1 FROM passenger_assistants pa
      LEFT JOIN drivers d ON d.employee_id = pa.employee_id
      WHERE pa.employee_id = NEW.employee_id
      AND (
        (pa.tas_badge_expiry_date IS NULL OR pa.tas_badge_expiry_date >= CURRENT_DATE) AND
        (pa.dbs_expiry_date IS NULL OR pa.dbs_expiry_date >= CURRENT_DATE) AND
        (pa.first_aid_certificate_expiry_date IS NULL OR pa.first_aid_certificate_expiry_date >= CURRENT_DATE) AND
        (pa.passport_expiry_date IS NULL OR pa.passport_expiry_date >= CURRENT_DATE) AND
        (d.employee_id IS NULL OR (
          (d.tas_badge_expiry_date IS NULL OR d.tas_badge_expiry_date >= CURRENT_DATE) AND
          (d.taxi_badge_expiry_date IS NULL OR d.taxi_badge_expiry_date >= CURRENT_DATE) AND
          (d.dbs_expiry_date IS NULL OR d.dbs_expiry_date >= CURRENT_DATE) AND
          (d.first_aid_certificate_expiry_date IS NULL OR d.first_aid_certificate_expiry_date >= CURRENT_DATE) AND
          (d.passport_expiry_date IS NULL OR d.passport_expiry_date >= CURRENT_DATE) AND
          (d.driving_license_expiry_date IS NULL OR d.driving_license_expiry_date >= CURRENT_DATE) AND
          (d.cpc_expiry_date IS NULL OR d.cpc_expiry_date >= CURRENT_DATE) AND
          (d.vehicle_insurance_expiry_date IS NULL OR d.vehicle_insurance_expiry_date >= CURRENT_DATE) AND
          (d.mot_expiry_date IS NULL OR d.mot_expiry_date >= CURRENT_DATE)
        ))
      );
      
      IF FOUND THEN
        UPDATE employees SET can_work = TRUE WHERE id = NEW.employee_id;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger if it doesn't exist
DROP TRIGGER IF EXISTS trigger_pa_expiry_check ON passenger_assistants;
CREATE TRIGGER trigger_pa_expiry_check
  AFTER INSERT OR UPDATE ON passenger_assistants
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_pa_expiry();

-- Add comment for documentation
COMMENT ON TABLE passenger_assistants IS 'Extended with complete checklist fields including certificates, documentation, and training records (excluding driver-specific fields)';

-- ====================================================================
-- Migration complete!
-- ====================================================================
-- New PA fields are now tracked in the expiry system.
-- The Certificate Expiry dashboard will automatically show these new dates.
-- ====================================================================
