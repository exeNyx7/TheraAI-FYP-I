# Use Node.js 18 Alpine image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json ./
COPY package-lock.json* ./

# Install dependencies
RUN npm ci --silent

# Copy app source
COPY . ./

# Expose port
EXPOSE 3000

# Start app with Vite
CMD ["npm", "run", "dev", "--", "--host"]