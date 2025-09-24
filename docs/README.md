# TheraAI - AI-Powered Therapy Platform

TheraAI is a full-stack application that provides AI-powered therapy assistance, combining modern web technologies with artificial intelligence to create a supportive mental health platform.

## 🏗️ Project Structure

```
TheraAI-FYP-I/
├── backend/                    # FastAPI backend
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py            # FastAPI entrypoint
│   │   ├── api/               # API routers
│   │   ├── models/            # MongoDB models
│   │   ├── schemas/           # Pydantic schemas
│   │   └── services/          # Business logic
│   ├── requirements.txt       # Python dependencies
│   └── Dockerfile
├── web/                       # React frontend
│   ├── src/
│   │   ├── App.jsx
│   │   ├── index.js
│   │   ├── components/        # Reusable components
│   │   └── pages/             # Page components
│   └── package.json
├── docs/                      # Documentation
│   ├── TODO.md               # Project planning
│   └── README.md             # This file
├── docker-compose.yml        # Multi-container setup
└── .gitignore
```

## 🚀 Getting Started

### Prerequisites

- **Node.js** (v16+)
- **Python** (v3.11+)
- **MongoDB** (v6+)
- **Docker** (optional)

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Create a `.env` file in the backend directory:
   ```env
   MONGODB_URL=mongodb://localhost:27017
   DATABASE_NAME=theraai
   SECRET_KEY=your-secret-key-here
   OPENAI_API_KEY=your-openai-api-key
   ```

5. Run the backend server:
   ```bash
   uvicorn app.main:app --reload
   ```

The API will be available at `http://localhost:8000`
- API Documentation: `http://localhost:8000/docs`
- Alternative docs: `http://localhost:8000/redoc`

### Frontend Setup

1. Navigate to the web directory:
   ```bash
   cd web
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm start
   ```

The frontend will be available at `http://localhost:3000`

### Docker Setup (Alternative)

1. Build and run with Docker Compose:
   ```bash
   docker-compose up --build
   ```

This will start both frontend and backend services along with MongoDB.

## 🛠️ Technology Stack

### Backend
- **FastAPI** - Modern, fast web framework for building APIs
- **MongoDB** - NoSQL database for flexible data storage
- **Motor** - Async MongoDB driver
- **Beanie** - ODM for MongoDB
- **OpenAI API** - AI integration for therapy assistance
- **LangChain** - Framework for LLM applications
- **Python-JOSE** - JWT token handling
- **Passlib** - Password hashing

### Frontend
- **React** - User interface library
- **Material-UI** - Component library
- **React Router** - Client-side routing
- **Axios** - HTTP client
- **Styled Components** - CSS-in-JS styling

### DevOps
- **Docker** - Containerization
- **Docker Compose** - Multi-container orchestration
- **Uvicorn** - ASGI server for FastAPI

## 📋 Features (Planned)

- [x] Project structure setup
- [ ] User authentication and authorization
- [ ] AI-powered therapy chat interface
- [ ] Therapy session management
- [ ] Progress tracking and analytics
- [ ] User dashboard
- [ ] Therapist-AI collaboration tools
- [ ] Mobile-responsive design
- [ ] Real-time messaging
- [ ] Mood tracking
- [ ] Appointment scheduling

## 🧪 Testing

### Backend Tests
```bash
cd backend
pytest
```

### Frontend Tests
```bash
cd web
npm test
```

## 📚 API Documentation

Once the backend is running, visit:
- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Links

- [Project Planning](./TODO.md)
- [API Documentation](http://localhost:8000/docs) (when running)
- [Frontend Development Server](http://localhost:3000) (when running)

## 💡 Support

For support, email your-email@example.com or open an issue on GitHub.

---

**Note**: This is a Final Year Project (FYP) for educational purposes. The AI therapy features are not a replacement for professional mental health care.