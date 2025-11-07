FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Expose port
EXPOSE 5000

# Start the application (production)
# Use the production start script rather than nodemon (dev) so Docker/Render runs stable process
CMD ["npm", "run", "start"]