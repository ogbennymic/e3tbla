# Stage 1: Build the React application
# This stage uses a Node.js image to build the application's production assets.
FROM node:18-alpine AS builder

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json to leverage Docker's layer caching.
# This ensures that we only reinstall dependencies if the package files change.
COPY package.json ./
COPY package-lock.json ./

# Install project dependencies
RUN npm install

# Copy the rest of the application source code
COPY . .

# Build the application for production. This will create a 'build' folder.
RUN npm run build

# Stage 2: Serve the application using a lightweight web server
# This stage uses a small, production-ready Nginx image to serve the static files.
FROM nginx:1.23-alpine

# Copy the built React app from the 'builder' stage into the Nginx public folder.
# This is a key part of the multi-stage build, as it only copies the final, optimized
# build artifacts, keeping the final image size very small.
COPY --from=builder /app/build /usr/share/nginx/html

# Expose port 80 to the outside world
EXPOSE 80

# Command to run Nginx in the foreground.
CMD ["nginx", "-g", "daemon off;"]
