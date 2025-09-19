# 📦 subscription-box-service
Backend service for subscription boxes featuring scheduling, recurring billing, and distributed inventory management.

## Architecture:
![Bun](https://img.shields.io/badge/Bun-000000?logo=bun&logoColor=white)
![Hono.js](https://img.shields.io/badge/Hono.js-FF5700?logo=hono&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![Drizzle ORM](https://img.shields.io/badge/Drizzle_ORM-3B82F6?logo=drizzle&logoColor=white)
![BullMQ](https://img.shields.io/badge/BullMQ-FF0000?logo=bullmq&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-DC382D?logo=redis&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-336791?logo=postgresql&logoColor=white)

- **Framework**: Hono.js with TypeScript
- **Runtime**: Bun
- **Database**: PostgreSQL with Drizzle ORM
- **Queue**: BullMQ with Redis
- **API Gateway**: Caddy

## Project Structure:
```plaintext
src/
├── config/          # Configuration files
├── controllers/     # HTTP controllers
├── db/              # Database schema and connection
├── jobs/            # Background jobs and schedulers
├── middleware/      # Custom middleware
├── routes/          # API route definitions
├── services/        # Business logic services
├── scripts/         # Utility scripts
└── index.ts         # Application entry point
```
## Features:
- User authentication & authorization (JWT)
- Subscription management (create, update, cancel)
- Recurring billing system with payment simulation
- Multi-warehouse inventory tracking with atomic updates
- Background job scheduling for notifications
- Comprehensive audit logging
- RESTful API with proper status codes
- Comprehensive test suite

## Quick Setup

### Prerequisites
- Docker and Docker Compose  
- Bun (optional for local development)  

---

### Docker Deployment (Recommended)

```bash
# Clone and setup
git clone <your-repo-url>
cd subscription-box-service

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f app

# Access API: https://localhost/api
# Access DB: localhost:5432 (Postgres: admin)
# Access Redis: localhost:6379
```
> **Note:** The admin account must be created directly in the database. The `/users` endpoint only creates regular user accounts. You can insert the admin manually using SQL or a database seeding script.

## API Endpoints

### Authentication Endpoints

| Method | Endpoint         | Description       | Auth   |
|--------|----------------|-----------------|--------|
| POST   | /api/users      | Register new user | Public |
| POST   | /api/users/login | User login       | Public |
| GET    | /api/users/me   | Get current user | User   |

### Subscription Endpoints

| Method | Endpoint                     | Description            | Auth  |
|--------|------------------------------|-----------------------|-------|
| POST   | /api/subscriptions/join      | Create subscription    | User  |
| GET    | /api/subscriptions/me        | Get user subscriptions | User  |
| GET    | /api/subscriptions           | List all subscriptions | Admin |
| PATCH  | /api/subscriptions/:id       | Update subscription    | Admin |
| DELETE | /api/subscriptions/:id       | Cancel subscription    | User/Admin |

### Product Endpoints

| Method | Endpoint                | Description          | Auth  |
|--------|------------------------|--------------------|-------|
| GET    | /api/products           | List products       | Public |
| POST   | /api/products           | Create product      | Admin  |
| GET    | /api/products/:id       | Get product details | Public |
| PATCH  | /api/products/:id       | Update product      | Admin  |
| DELETE | /api/products/:id       | Delete product      | Admin  |

### Inventory Endpoints

| Method | Endpoint                  | Description          | Auth  |
|--------|---------------------------|--------------------|-------|
| GET    | /api/inventory            | View inventory      | Admin |
| POST   | /api/inventory            | Update inventory    | Admin |
| GET    | /api/inventory/:id        | Get inventory item  | Admin |
| PATCH  | /api/inventory/:id        | Update inventory item | Admin |

### Order Endpoints

| Method | Endpoint             | Description        | Auth      |
|--------|-------------------|------------------|----------|
| GET    | /api/orders/me      | Get user orders   | User     |
| GET    | /api/orders         | List all orders   | Admin    |
| GET    | /api/orders/:id     | Get order details | User/Admin |


## Database Schema
**Key Tables:**

- `users` – User accounts and profiles  
- `subscriptions` – User subscription plans  
- `subscription_plans` – Available plan types  
- `products` – Product catalog  
- `fulfillment_centers` – Warehouse locations  
- `inventory` – Stock levels per product per center  
- `orders` – Order history  
- `audit_logs` – Security and event logging  

## Security Features

- JWT-based authentication with role-based access control  
- Password hashing with bcrypt  
- SQL injection prevention through Drizzle ORM  
- CORS configuration  
- Rate limiting ready  
- Audit logging for sensitive operations  

## CI/CD Pipeline

The project includes a GitLab CI/CD pipeline with:

```yaml
stages:
  - lint      # Code quality checking
  - test      # Unit and integration tests
  - build     # Docker image building
  - deploy    # Deployment to production
```

## Test Coverage

- Unit tests for all services  
- Integration tests for API endpoints  
- Concurrency tests for atomic inventory updates  
- Authentication and authorization tests  
- Error handling and edge case testing 

**Run Tests:**
```bash
docker exec -it subscription-box-service-app-1 bun test
```
---
💻 Built with dedication and care! 🛠️