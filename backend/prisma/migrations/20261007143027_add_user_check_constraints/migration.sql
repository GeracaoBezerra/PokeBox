ALTER TABLE "User"
  ADD CONSTRAINT "user_username_format_check"
  CHECK ("username" ~ '^[a-z0-9_]{3,20}$');

ALTER TABLE "User"
  ADD CONSTRAINT "user_email_format_check"
  CHECK ("email" ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$');

ALTER TABLE "User"
  ADD CONSTRAINT "user_name_not_blank_check"
  CHECK (length(btrim("name")) >= 2);
