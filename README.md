
# Enterprise IT Service Desk

A full-stack Enterprise IT Service Desk application built using the MERN stack. The system provides a centralized platform for employees to raise IT support requests, administrators to manage operations, and support engineers to resolve incidents through a complete ITSM workflow.

---

## Features

### Employee Portal
- User authentication (JWT)
- Create IT support tickets
- Track ticket status
- View ticket history
- Notifications
- Knowledge Base
- Profile management

### Admin Portal
- Dashboard with analytics
- User management
- Engineer management
- Department management
- Category management
- SLA management
- Role management
- Audit logs
- System settings
- Ticket assignment

### Support Engineer Portal
- Assigned ticket queue
- Ticket lifecycle management
- Public replies
- Internal notes
- Attachment handling
- SLA tracking
- Performance dashboard
- Notifications

---

## Ticket Workflow

Employee
→ Create Ticket
→ Admin Assigns Engineer
→ Engineer Accepts
→ In Progress
→ Resolved
→ Employee Confirms
→ Closed

---

## Tech Stack

### Frontend
- React
- Vite
- React Router
- Axios
- Tailwind CSS
- Recharts
- Lucide Icons

### Backend
- Node.js
- Express.js
- MongoDB
- Mongoose
- JWT Authentication
- bcrypt

---

## Project Structure

```
Employee_IT_HelpDesk
│
├── backend
│   ├── config
│   ├── controllers
│   ├── middleware
│   ├── models
│   ├── routes
│   └── utils
│
├── frontend
│   ├── src
│   │   ├── components
│   │   ├── context
│   │   ├── layouts
│   │   ├── pages
│   │   ├── services
│   │   └── styles
│   └── public
```

---

## Security

- JWT Authentication
- Role-Based Access Control
- Protected Routes
- Error Boundaries
- Password Hashing
- Secure API Authorization
- CORS Configuration

---

## Installation

### Clone Repository

```bash
git clone https://github.com/sudhir3116/Enterprise-IT-ServiceDesk.git
```

### Backend

```bash
cd backend
npm install
npm run dev
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

---

## Environment Variables

Backend

```
MONGO_URI=
JWT_SECRET=
CLIENT_URL=
```

Frontend

```
VITE_API_BASE=
```

---

## Deployment

Frontend: Vercel

Backend: Render

Database: MongoDB Atlas

---

## Future Enhancements

- Email notifications
- File storage (AWS S3 / Cloudinary)
- Real-time chat
- AI-powered ticket categorization
- Advanced analytics
- Mobile application

---

## Author

**Sudhir S**

GitHub:
https://github.com/sudhir3116

---

## License

This project is created for educational and portfolio purposes.