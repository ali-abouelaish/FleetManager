# Call Logs Feature

## 📞 Overview

The Call Logs feature allows you to track all phone communications related to your fleet operations. This is essential for documenting parent inquiries, complaints, incident reports, and schedule changes.

## ✨ Features

### **Track Multiple Call Types**
- 📋 **Inquiry** - General questions
- 🔴 **Complaint** - Issues or concerns
- 🚨 **Incident Report** - Emergency or safety issues
- 📅 **Schedule Change** - Pickup/dropoff adjustments
- 👍 **Compliment** - Positive feedback
- 📝 **Other** - Miscellaneous calls

### **Caller Types**
- 👨‍👩‍👧‍👦 **Parent** - Parent/guardian calls
- 🏫 **School** - School staff calls
- 👔 **Employee** - Internal staff calls
- 🔵 **Other** - External parties

### **Priority Levels**
- 🟢 **Low** - General inquiries
- 🟡 **Medium** - Standard issues
- 🟠 **High** - Important matters
- 🔴 **Urgent** - Critical issues

### **Status Tracking**
- ⚪ **Open** - New call logged
- 🔵 **In Progress** - Being handled
- ✅ **Resolved** - Issue resolved
- ⚫ **Closed** - Completed

### **Related Information**
Link calls to:
- 👶 **Passengers** - Specific student/passenger
- 👔 **Employees** - Staff member involved
- 🚌 **Routes** - Affected route
- 🚨 **Incidents** - Related incident (if any)

### **Action Tracking**
- ✔️ **Action Required** checkbox
- 📝 **Action Taken** field
- 🔔 **Follow-up Required** checkbox
- 📅 **Follow-up Date** picker

## 📊 Database Schema

```sql
CREATE TABLE call_logs (
  id SERIAL PRIMARY KEY,
  call_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  caller_name VARCHAR,
  caller_phone VARCHAR,
  caller_type VARCHAR,
  call_type VARCHAR,
  related_passenger_id INTEGER REFERENCES passengers(id),
  related_employee_id INTEGER REFERENCES employees(id),
  related_route_id INTEGER REFERENCES routes(id),
  related_incident_id INTEGER REFERENCES incidents(id),
  subject VARCHAR NOT NULL,
  notes TEXT,
  action_required BOOLEAN DEFAULT FALSE,
  action_taken TEXT,
  follow_up_required BOOLEAN DEFAULT FALSE,
  follow_up_date DATE,
  handled_by INTEGER REFERENCES users(id),
  priority VARCHAR,
  status VARCHAR DEFAULT 'Open',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 🚀 Setup

### Run the Migration

In Supabase SQL Editor:
```sql
-- Copy and run: supabase/migrations/004_add_call_logs.sql
```

This creates:
- ✅ `call_logs` table with all fields
- ✅ Indexes for performance
- ✅ Row Level Security policies
- ✅ 5 sample call log entries

### Access the Feature

Navigate to `/dashboard/call-logs` or click **Call Logs** in the sidebar (Phone icon 📞).

## 📋 Usage Examples

### **Example 1: Parent Inquiry**
```
Caller: Margaret Thompson (555-1001)
Type: Parent → Inquiry
Subject: Question about pickup time
Notes: Parent asked if pickup time could be moved 15 minutes earlier...
Priority: Low
Status: Resolved
Related: Oliver Thompson (Passenger)
```

### **Example 2: School Schedule Change**
```
Caller: Greenfield Primary (555-2001)
Type: School → Schedule Change
Subject: Early dismissal next Friday
Notes: School closing early (1pm) for staff training...
Priority: High
Status: In Progress
Action Required: ✓
```

### **Example 3: Parent Complaint**
```
Caller: Susan Wilson (555-1003)
Type: Parent → Complaint
Subject: Late pickup yesterday
Notes: Route R-101 was 20 minutes late yesterday...
Priority: Medium
Status: Resolved
Related: Emma Wilson (Passenger), Route R-101
```

## 🎯 Use Cases

### **Daily Operations**
- Log all incoming calls
- Track parent inquiries
- Document schedule changes
- Record complaints and resolutions

### **Compliance & Documentation**
- Maintain communication records
- Track action items
- Follow up on pending issues
- Audit trail for compliance

### **Customer Service**
- Track response times
- Monitor complaint resolution
- Identify recurring issues
- Improve service quality

### **Incident Management**
- Link calls to incidents
- Document emergency reports
- Track safety concerns
- Follow up on resolutions

## 📊 Call Log Workflow

```
1. Receive Call
   ↓
2. Log in System (Log Call button)
   ↓
3. Fill Details:
   - Caller info
   - Call type
   - Subject & notes
   - Priority
   ↓
4. Link Related Items:
   - Passenger
   - Employee
   - Route
   ↓
5. Set Action Items:
   - Action required?
   - Follow-up needed?
   ↓
6. Update Status:
   Open → In Progress → Resolved → Closed
```

## 🔍 Features in Detail

### **Rich Table View**
The call logs list shows:
- 📅 Date/time of call
- 📞 Caller name, phone, type
- 🏷️ Call type badge
- 📝 Subject with truncated notes
- 🔗 Related entities (clickable links)
- 🎨 Color-coded priority badges
- ✅ Status badges
- ⚡ Action required indicator

### **Detailed View Page**
- Complete caller information
- Full call details
- Priority and status badges
- Complete notes and action taken
- Related information with links
- Edit and delete options

### **Smart Filtering** (Future Enhancement)
Could add filters for:
- Date range
- Caller type
- Call type
- Priority
- Status
- Action required
- Follow-up required

### **Reports** (Future Enhancement)
Could generate:
- Daily call summary
- Weekly activity report
- Call type breakdown
- Average resolution time
- Open action items list

## 📈 Sample Data

The migration includes 5 sample calls:
1. Parent inquiry about pickup time
2. Parent complaint about late pickup
3. School schedule change notification
4. Parent incident report (child forgot medication)
5. Parent inquiry about new vehicle

## 🎨 UI Features

### **Color Coding**
- **Priority**: Red (Urgent) → Orange (High) → Yellow (Medium) → Gray (Low)
- **Status**: Green (Resolved/Closed) → Blue (In Progress) → Gray (Open)
- **Call Type**: Blue badge for all types

### **Smart Forms**
- Auto-populated date/time
- Dropdowns for consistent data
- Checkboxes for boolean flags
- Related entity selectors

### **Responsive Design**
- Mobile-friendly table
- Truncated text with hover
- Compact view on small screens

## 🔒 Security

- ✅ Row Level Security enabled
- ✅ Authenticated users only
- ✅ Audit logging on create/update/delete
- ✅ Proper foreign key constraints

## 🎯 Best Practices

### **Log Immediately**
- Log calls as they happen
- Don't wait until end of day
- Ensures accurate details

### **Be Specific**
- Include caller name and phone
- Write clear subject lines
- Add detailed notes

### **Link Related Items**
- Always link to passenger if relevant
- Link to route for schedule issues
- Connect to incidents when applicable

### **Set Priority Correctly**
- Urgent: Safety/emergency issues
- High: Important operational matters
- Medium: Standard inquiries/issues
- Low: General questions

### **Follow Up**
- Check "Follow-up Required" when needed
- Set specific follow-up dates
- Update status as you progress
- Close when fully resolved

## 🚀 Future Enhancements

Possible additions:
- 📧 Email notifications for urgent calls
- 📊 Call analytics dashboard
- 🔍 Advanced search/filtering
- 📱 SMS integration
- 🤖 Auto-classification with AI
- 📞 Call recording links
- ⏱️ Response time tracking
- 📈 Satisfaction ratings

## 💡 Tips

1. **Use Search**: Use browser search (Ctrl+F) to find specific callers
2. **Batch Updates**: Update multiple calls at once when resolving similar issues
3. **Export Data**: Can query via Supabase for reports/exports
4. **Regular Review**: Check open calls daily
5. **Document Everything**: Better to over-document than miss details

---

**Your communication is now tracked and organized!** 📞✨

Navigate to `/dashboard/call-logs` to start logging calls.






