# 🚀 Morya Fitness – Production Database & Hosting Guide

This guide explains how to connect Morya Fitness to a **real production database (PostgreSQL or MySQL)** and deploy it to any **VPS or Cloud Server**.

---

## 🗄️ 1. Real Database Options

The backend is configured with **multi-database support** using standard `DATABASE_URL` environment variables:

| Database | Supported Drivers | Typical Hosting Environment |
| :--- | :--- | :--- |
| **PostgreSQL 14 / 15 / 16** *(Recommended)* | `psycopg2-binary`, `dj-database-url` | Ubuntu VPS, AWS RDS, Supabase, Neon, Railway, Render |
| **MySQL 8.0+ / MariaDB** | `pymysql`, `mysqlclient` | cPanel, Ubuntu VPS, AWS RDS, Hostinger |
| **SQLite** *(Default)* | Built-in | Local development & testing |

---

## ⚙️ 2. Connecting to PostgreSQL or MySQL

### Method A: Using a `DATABASE_URL` in `.env` (Simplest)
Create a `.env` file in the `backend/` folder:

```env
# PostgreSQL Example:
DATABASE_URL=postgres://morya_user:YourSecurePassword123@localhost:5432/morya_fitness_db

# MySQL Example:
# DATABASE_URL=mysql://morya_user:YourSecurePassword123@localhost:3306/morya_fitness_db
```

### Method B: Using Explicit DB Parameters in `.env`
```env
DB_ENGINE=django.db.backends.postgresql
DB_NAME=morya_fitness_db
DB_USER=morya_user
DB_PASSWORD=YourSecurePassword123
DB_HOST=localhost
DB_PORT=5432
```

Then run migrations to set up the real database tables:
```bash
python manage.py migrate
python manage.py reset_data
```

---

## 🐳 3. Option 1: 1-Click Docker Deployment (Recommended for VPS)

With Docker and Docker Compose installed on your VPS (Ubuntu/Debian), run:

```bash
# 1. Clone your repository to the VPS
git clone <your-repo-url> /opt/morya-fitness
cd /opt/morya-fitness

# 2. Build and start all 3 containers (PostgreSQL + Django + Nginx/React)
docker compose up -d --build
```

### ✨ That's it!
* **Frontend Web App**: Available on Port `80` (`http://your-server-ip`)
* **Backend API**: Running via Gunicorn on Port `8000`
* **PostgreSQL Database**: Isolated and persistent in Docker Volume `postgres_data`

---

## 🖥️ 4. Option 2: Native Ubuntu 22.04 / 24.04 VPS Setup

### Step 1: Install PostgreSQL, Python & Nginx
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y python3-pip python3-venv postgresql postgresql-contrib nginx git
```

### Step 2: Create PostgreSQL Database & User
```bash
sudo -u postgres psql

# Run inside Postgres prompt:
CREATE DATABASE morya_fitness_db;
CREATE USER morya_user WITH PASSWORD 'YourStrongPassword123';
ALTER ROLE morya_user SET client_encoding TO 'utf8';
ALTER ROLE morya_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE morya_user SET timezone TO 'Asia/Kolkata';
GRANT ALL PRIVILEGES ON DATABASE morya_fitness_db TO morya_user;
\q
```

### Step 3: Set up Backend
```bash
cd /opt/morya-fitness/backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Create .env
cat <<EOT >> .env
DJANGO_SECRET_KEY=$(openssl rand -hex 32)
DJANGO_DEBUG=False
DJANGO_ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com,127.0.0.1
DATABASE_URL=postgres://morya_user:YourStrongPassword123@localhost:5432/morya_fitness_db
EOT

python manage.py migrate
python manage.py reset_data
python manage.py collectstatic --noinput
```

### Step 4: Create Systemd Service for Gunicorn
```bash
sudo nano /etc/systemd/system/morya-backend.service
```
Paste the following:
```ini
[Unit]
Description=Gunicorn daemon for Morya Fitness API
After=network.target

[Service]
User=root
WorkingDirectory=/opt/morya-fitness/backend
ExecStart=/opt/morya-fitness/backend/venv/bin/gunicorn --access-logfile - --workers 3 --bind 127.0.0.1:8000 morya_backend.wsgi:application
Restart=always

[Install]
WantedBy=multi-user.target
```
Enable and start the service:
```bash
sudo systemctl daemon-reload
sudo systemctl start morya-backend
sudo systemctl enable morya-backend
```

### Step 5: Build Frontend & Configure Nginx
```bash
cd /opt/morya-fitness/frontend
npm install
npm run build
```

Configure Nginx:
```bash
sudo nano /etc/nginx/sites-available/morya-fitness
```
```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # React Frontend Single Page App
    location / {
        root /opt/morya-fitness/frontend/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # Django Backend API Reverse Proxy
    location /api/ {
        proxy_pass http://127.0.0.1:8000/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Static & Media files
    location /static/ {
        alias /opt/morya-fitness/backend/staticfiles/;
    }

    location /media/ {
        alias /opt/morya-fitness/backend/media/;
    }
}
```
Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/morya-fitness /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### Step 6: Add Free SSL Certificate (HTTPS)
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

---

## ☁️ 5. Option 3: Managed Cloud Hosting (Render / Railway / Supabase)

1. **Database**: Create a free PostgreSQL instance on [Supabase.com](https://supabase.com) or [Neon.tech](https://neon.tech) and copy the Connection String (`postgres://...`).
2. **Backend**: Deploy the `backend/` folder on [Render.com](https://render.com) or [Railway.app](https://railway.app) and paste `DATABASE_URL` into your environment variables.
3. **Frontend**: Deploy the `frontend/` folder on [Vercel](https://vercel.com) or [Netlify](https://netlify.com) with the build command `npm run build` and publish directory `dist`.

---

## 🔑 Default Production Admin Credentials
* **Username**: `admin`
* **Password**: `admin123`
* *(You can change your password immediately from the Settings / Admin panel once deployed).*
