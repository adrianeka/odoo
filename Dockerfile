FROM odoo:17

# Gunakan root sebentar untuk setup folder & config
USER root

# Gabungkan mkdir dan chown dalam satu layer untuk efisiensi
RUN mkdir -p /mnt/extra-addons /var/lib/odoo/filestore /etc/odoo && \
    chown -R odoo:odoo /mnt/extra-addons /var/lib/odoo /etc/odoo

# Copy config file (setelah chown agar file baru ini juga dimiliki odoo)
COPY --chown=odoo:odoo ./config/odoo.conf /etc/odoo/odoo.conf

# KUNCI: Balikkan lagi ke user odoo agar aplikasi tidak error saat running
USER odoo

EXPOSE 8069