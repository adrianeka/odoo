# Use official Odoo 17 base if available; adjust if you prefer building from source
FROM odoo:17

# Switch to root to create directories and copy files
USER root
RUN mkdir -p /mnt/extra-addons /var/lib/odoo/filestore /etc/odoo

# Copy config file
COPY ./config/odoo.conf /etc/odoo/odoo.conf

# Set proper permissions
RUN chown -R odoo:odoo /mnt/extra-addons /var/lib/odoo /etc/odoo


# Default command from base image will run Odoo
# Expose port 8069 internally; compose will map to 8070
EXPOSE 8069
