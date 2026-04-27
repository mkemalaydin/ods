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

#!/usr/bin/env bash
# exit on error
set -o errexit

# Install Python dependencies
pip install -r requirements.txt

# Set Django settings module
export DJANGO_SETTINGS_MODULE=ods_app.settings

# Run Django migrations
python manage.py migrate

# Collect static files
python manage.py collectstatic --no-input