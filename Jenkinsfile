
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
        stage('Verify checkout') {
            steps {
                sh '''
                    set -eu
                    echo "Workspace: $WORKSPACE"
                    test -f docker-compose.yml || {
                        echo "ERROR: docker-compose.yml is missing from workspace"
                        pwd
                        ls -la
                        exit 1
                    }
                    test -f Dockerfile || {
                        echo "ERROR: Dockerfile is missing"
                        exit 1
                    }
                    echo "Repository files verified"
                '''
            }
        }

        stage('Load deployment environment') {
            steps {
                // Jenkins credential: Secret file, ID: .env
                withCredentials([
                    file(credentialsId: '.env', variable: 'ENV_FILE')
                ]) {
                    sh '''
                        set -eu
                        cp "$ENV_FILE" .env
                        chmod 600 .env
                        test -s .env
                        echo "Deployment environment loaded"
                    '''
                }
            }
        }

        stage('Validate Compose') {
            steps {
                sh '''
                    set -eu
                    docker --version
                    docker compose version
                    docker compose -f docker-compose.yml config -q
                    echo "Compose configuration is valid"
                '''
            }
        }

        stage('Build images') {
            steps {
                sh 'docker compose -f docker-compose.yml build'
            }
        }

        stage('Start database and wait') {
            steps {
                sh '''
                    set -eu
                    docker compose -f docker-compose.yml up -d db

                    DB_ID="$(docker compose -f docker-compose.yml ps -q db)"
                    if [ -z "$DB_ID" ]; then
                        echo "ERROR: MySQL container was not created"
                        docker compose -f docker-compose.yml logs db
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
                            docker compose -f docker-compose.yml logs db
                            exit 1
                        fi

                        i=$((i + 1))
                        sleep 2
                    done

                    docker compose -f docker-compose.yml logs db
                    echo "ERROR: Timed out waiting for MySQL"
                    exit 1
                '''
            }
        }

        stage('Database migrations') {
            steps {
                sh '''
                    set -eu
                    docker compose -f docker-compose.yml run --rm backend \
                        python manage.py migrate --noinput
                '''
            }
        }

        stage('Deploy application') {
            steps {
                sh '''
                    set -eu
                    docker compose -f docker-compose.yml up -d --build --remove-orphans
                '''
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

for attempt in range(30):
    try:
        with urllib.request.urlopen(url, timeout=4) as response:
            if response.status < 500:
                print(f"Smoke test passed: HTTP {response.status}")
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
            sh '''
                docker compose -f docker-compose.yml ps -a || true
            '''
        }

        success {
            echo 'CandyStore deployment completed. Open http://YOUR_EC2_PUBLIC_IP/'
        }

        failure {
            sh '''
                docker compose -f docker-compose.yml logs --tail=100 || true
            '''
        }
    }
}
