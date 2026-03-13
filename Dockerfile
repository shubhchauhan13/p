# Stage 1: Build the React frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend

# Install dependencies
COPY frontend/package*.json ./
RUN npm install

# Copy source code and build
COPY frontend/ ./
RUN npm run build

# Stage 2: Build the Python backend and serve
FROM python:3.11-slim
WORKDIR /app

# Install backend dependencies
COPY backend/requirements.txt ./backend/
RUN pip install --no-cache-dir -r backend/requirements.txt

# Copy backend code
COPY backend/ ./backend/

# Copy built frontend from Stage 1 into the location the backend expects
COPY --from=frontend-builder /app/frontend/dist /app/frontend/dist

# Expose the dynamic port (Railway uses $PORT)
EXPOSE $PORT

# Start the FastAPI server (it dynamically uses $PORT from config.py)
WORKDIR /app/backend
CMD ["python", "main.py"]
