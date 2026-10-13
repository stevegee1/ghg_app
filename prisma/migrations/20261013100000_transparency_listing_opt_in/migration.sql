-- Sign-up used to list every company on the public transparency page. No one chose that,
-- so every listing is withdrawn; companies opt in again from Settings.
UPDATE "Licensee" SET "isPubliclyVisible" = false WHERE "isPubliclyVisible" = true;
