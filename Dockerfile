FROM odoo:17

USER root

# Cukup buat folder yang sekiranya tidak di-mount atau butuh struktur awal
RUN mkdir -p /mnt/extra-addons /etc/odoo && \
    chown -R odoo:odoo /mnt/extra-addons /etc/odoo

# Copy config dengan owner yang tepat
COPY --chown=odoo:odoo ./config/odoo.conf /etc/odoo/odoo.conf

# Tetap gunakan user odoo untuk keamanan
USER odoo

EXPOSE 8069
