-- The sending-only domain credential is provisioned separately in Vault.
create or replace function public.fp_intake_mail_key()
returns text
language sql
security definer
set search_path = ''
as $$
  select decrypted_secret from vault.decrypted_secrets where name = 'frankenpakt_mail_sending'
$$;
revoke all on function public.fp_intake_mail_key() from public, anon, authenticated;
grant execute on function public.fp_intake_mail_key() to service_role;
