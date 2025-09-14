# Use official Bun image
FROM oven/bun:1 AS base

WORKDIR /app

# Copy only lockfile and package.json first for caching
COPY package.json bun.lockb* ./

RUN bun install --frozen-lockfile

# Copy rest of the code
COPY . .

EXPOSE 3000

CMD ["bun", "run", "dev"]