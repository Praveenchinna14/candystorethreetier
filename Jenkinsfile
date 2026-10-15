pipeline {
    agent any

    options {
        timestamps()
        disableConcurrentBuilds()
    }

    environment {
        COMPOSE_PROJECT_NAME = 'candystore'
    }

    stages {
        stage('Checkout') {
            steps {
                git branch: 'master', url: 'https://github.com/Praveenchinna14/CandyStore.git'
            }
        }

        stage('Load deployment environment') {
            steps {
                // Jenkins credential type: Secret file, ID: candystore-env-file
                withCredentials([file(credentialsId: 'candystore-env-file', variable: 'ENV_FILE')]) {
                    sh '''
                        cp "$ENV_FILE" .env
                        chmod 600 .env
                    '''
                }
            }
        }

        stage('Validate Compose') {
            steps {
                sh '''
                    docker --version
                    docker compose version
                    docker compose config -q
                '''
            }
        }

        stage('Build images') {
            steps {
                sh 'docker compose build'
            }
        }

        stage('Start database and wait') {
            steps {
                sh '''
                    set -eu
                    docker compose up -d db
                    DB_ID="$(docker compose ps -q db)"
                    if [ -z "$DB_ID" ]; then
                      echo "MySQL container was not created"
                      docker compose logs db
                      exit 1
                    fi
                    i=0
                    while [ "$i" -lt 60 ]; do
                      STATUS="$(docker inspect --format='{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' "$DB_ID")"
                      if [ "$STATUS" = "healthy" ]; then
                        echo "MySQL is healthy"
                        exit 0
                      fi
                      if [ "$STATUS" = "unhealthy" ]; then
                        docker compose logs db
                        exit 1
                      fi
                      i=$((i + 1))
                      sleep 2
                    done
                    docker compose logs db
                    echo "Timed out waiting for MySQL health check"
                    exit 1
                '''
            }
        }

        stage('Database migrations') {
            steps {
                sh 'docker compose run --rm backend python manage.py migrate --noinput'
            }
        }

        stage('Deploy application') {
            steps {
                sh 'docker compose up -d --build --remove-orphans'
            }
        }

        stage('Smoke test') {
            steps {
                sh '''
                    python3 - <<'PY'
import time
import urllib.request

url = "http://127.0.0.1/"
last_error = None
for _ in range(30):
    try:
        with urllib.request.urlopen(url, timeout=4) as response:
            if response.status < 500:
                print(f"Smoke test passed: {url} returned HTTP {response.status}")
                raise SystemExit(0)
    except Exception as exc:
        last_error = exc
    time.sleep(2)
print(f"Smoke test failed: {last_error}")
raise SystemExit(1)
PY
                '''
            }
        }
    }

    post {
        always {
            sh 'docker compose ps -a || true'
        }
        success {
            echo 'CandyStore deployment completed. Open http://YOUR_EC2_PUBLIC_IP/'
        }
        failure {
            sh 'docker compose logs --tail=100 || true'
        }
    }
}
