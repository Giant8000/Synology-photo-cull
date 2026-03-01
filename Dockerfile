# Use Node.js LTS
FROM node:20-slim

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
# Note: sharp will download prebuilt binaries for the platform
RUN npm install

# Copy source code
COPY . .

# Build the frontend
RUN npm run build

# Expose the port
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production

# Start the application
# Using tsx to run server.ts directly in production
CMD ["npx", "tsx", "server.ts"]
