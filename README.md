# Virtual Plant Care Assistant (VPCA)

A smart web application for plant identification, disease detection, and personalized care recommendations.

## Features

- 🌿 **Plant Identification**: Upload images to identify plant species using AI
- 🔍 **Disease Detection**: Detect early signs of plant diseases (leaf spots, discoloration, fungal growth, wilting)
- 💡 **Care Tips**: Get personalized care recommendations (watering, sunlight, soil, temperature)
- 💊 **Remedy Suggestions**: Receive treatment recommendations for detected diseases
- 📊 **Dashboard**: View statistics and recent activity
- 📜 **History**: Track your plant identification history

## Technologies

- **Frontend**: React.js
- **Build Tool**: Vite (latest)
- **Routing**: React Router DOM v6
- **Backend**: Vercel Serverless Functions
- **Styling**: Bootstrap 5.3.2
- **JavaScript**: jQuery 3.7.1
- **Icons**: Font Awesome 6.4.0

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. The app will automatically open in your browser at [http://localhost:3000](http://localhost:3000)

## Build for Production

```bash
npm run build
```

The production build will be in the `dist` folder.

## Preview Production Build

```bash
npm run preview
```

## Project Structure

```
VPCAssistant/
├── api/                          # Vercel Serverless Functions
│   ├── login.js
│   ├── register.js
│   ├── forgot-password.js
│   └── reset-password.js
├── src/
│   ├── components/
│   │   ├── Login.jsx
│   │   ├── Register.jsx
│   │   ├── ForgotPassword.jsx
│   │   ├── ProtectedRoute.jsx
│   │   ├── Layout.jsx
│   │   ├── Sidebar.jsx
│   │   ├── Dashboard.jsx
│   │   ├── PlantIdentification.jsx
│   │   ├── Results.jsx
│   │   ├── CareTips.jsx
│   │   └── History.jsx
│   ├── context/
│   │   └── AuthContext.jsx
│   ├── App.jsx
│   ├── App.css
│   ├── index.jsx
│   └── index.css
├── index.html
├── vite.config.js
├── vercel.json
├── package.json
└── README.md
```

## Usage

1. **Register/Login**: Create an account or login to access the application
   - Login API: `POST /api/login`
   - Register API: `POST /api/register`
   - Forgot Password API: `POST /api/forgot-password`
2. **Identify Plant**: Upload a plant image to identify the species and detect diseases
3. **View Results**: See identification results, disease status, and care recommendations
4. **Care Tips**: Browse care guides for common plants
5. **History**: View your past plant identifications

## API Endpoints

All API endpoints are Vercel serverless functions located in the `api/` directory:

- **POST /api/login** - User login
  - Body: `{ email: string, password: string }`
  - Returns: `{ success: boolean, user: object, token: string }`

- **POST /api/register** - User registration
  - Body: `{ name: string, email: string, password: string }`
  - Returns: `{ success: boolean, user: object, token: string }`

- **POST /api/forgot-password** - Request password reset
  - Body: `{ email: string }`
  - Returns: `{ success: boolean, message: string }`

- **POST /api/reset-password** - Reset password with token
  - Body: `{ token: string, password: string, confirmPassword: string }`
  - Returns: `{ success: boolean, message: string }`

## Authentication

The app uses React Router DOM for routing with protected routes. Authentication state is managed through `AuthContext` and stored in localStorage. Protected routes automatically redirect to login if the user is not authenticated.

## Future Enhancements

- Backend API integration with Node.js + Express.js
- Firebase database integration
- MobileNetV2 model integration for actual AI predictions
- Real-time notifications
- Mobile app version

## License

This project is for educational purposes.

