#!/usr/bin/env bash
# exit on error
set -o errexit

# Install Python dependencies
pip install -r requirements.txt

#!/usr/bin/env bash
# exit on error
set -o errexit

# Install Python dependencies
pip install -r requirements.txt

# Run Django migrations
DJANGO_SETTINGS_MODULE=ods_app.settings python manage.py migrate

# Collect static files
DJANGO_SETTINGS_MODULE=ods_app.settings python manage.py collectstatic --no-input