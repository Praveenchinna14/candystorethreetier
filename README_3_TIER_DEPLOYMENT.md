# CandyStore: Three-tier Docker Compose + Jenkins deployment

## Architecture

The upstream repository is a Django application that renders HTML templates and uses static assets; it is not a separate React frontend and REST API. This overlay preserves the existing templates and views and separates the runtime into three tiers:

1. **Frontend / web tier:** Nginx on port 80; serves static assets and reverse-proxies dynamic requests.
2. **Application tier:** Django + Gunicorn on port 8000, reachable only on the private Compose network.
3. **Database tier:** MySQL 8.4, reachable only by the application tier and persisted in a named Docker volume.

Keep the existing `templates/`, `static/`, `home/`, `CandyStore/`, and `manage.py` source files in the repository.

## 1. Copy the deployment files

Copy this package's files into the root of the cloned CandyStore repository. The package includes a replacement `CandyStore/settings.py`, Dockerfile, Compose file, requirements, entrypoint, Nginx config, environment template, ignore files, and Jenkinsfile.

## 2. Create the environment file

```bash
cp .env.example .env
```

Edit `.env` and set strong, unique values for `DJANGO_SECRET_KEY`, `MYSQL_PASSWORD`, and `MYSQL_ROOT_PASSWORD`. Replace `EC2_PUBLIC_IP_OR_DOMAIN` in `DJANGO_ALLOWED_HOSTS` with the actual EC2 public IP or DNS name. In `DJANGO_CSRF_TRUSTED_ORIGINS`, include the scheme, such as `http://203.0.113.10`. Do not include a trailing slash in an origin.

Never commit `.env`. `.env.example` contains placeholders only.

## 3. Build and run manually

From the repository root:

```bash
docker compose config -q
docker compose build
docker compose up -d db
docker compose run --rm backend python manage.py migrate --noinput
docker compose up -d --build --remove-orphans
docker compose ps -a
docker compose logs --tail=100
```

Open `http://YOUR_EC2_PUBLIC_IP/`. The AWS security group needs inbound TCP port 80 from intended client IPs. Do not expose MySQL port 3306 or Django port 8000 publicly.

## 4. Jenkins prerequisites

Run this pipeline on a Jenkins agent that is the deployment host, or otherwise has access to the target Docker daemon and Compose project. The agent needs Git, Docker Engine, Docker Compose v2, and Python 3.

1. In Jenkins, create a **Secret file** credential with ID `candystore-env-file`. Upload the production `.env` file as its contents.
2. Create a Pipeline job using this repository's `Jenkinsfile` (or use Pipeline from SCM).
3. Ensure the Jenkins OS user has permission to access Docker. Do not make `/var/run/docker.sock` world-writable to fix permissions.
4. Run the pipeline. It checks out `master`, loads the environment secret, validates Compose, builds images, waits for MySQL, runs migrations, deploys, and smoke-tests HTTP.

If Jenkins runs on a separate machine, the pipeline as written deploys to that machine's Docker daemon. Use an agent on the target EC2 host or adapt deployment to run remotely over SSH.

## 5. Existing SQLite data

The upstream repository has a `db.sqlite3` file, but this deployment uses a fresh MySQL volume. Django migrations create the schema; they do **not** copy records from SQLite into MySQL. Export/import any records you need before switching traffic.

Do not run `docker compose down -v` unless you intentionally want to delete the MySQL volume and its data.

## 6. Security and production notes

- This is a single-host Compose deployment for a project/demo, not a multi-AZ highly available architecture.
- Configure HTTPS with a domain and TLS termination before setting `DJANGO_SECURE_SSL_REDIRECT=True`.
- Set `DJANGO_ALLOWED_HOSTS` and `DJANGO_CSRF_TRUSTED_ORIGINS` to real hosts; do not use wildcard hosts.
- Store `.env` only in Jenkins credentials or securely on the host.
- The public repository listing includes a file named `kumar.pem`. If that is a real private SSH key, treat it as compromised: revoke/replace the associated key and remove it from Git history. `.dockerignore` excludes PEM files from image builds but does not remove them from Git.
- Test migrations and application behavior before moving any existing data from SQLite to MySQL.
