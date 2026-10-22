-- Manual step via ArenaHub Lovable Cloud SQL editor, not automatically applied by GitHub.
-- Prevent old/uncooperative browser clients from resurrecting completed stream rows.
CREATE OR REPLACE FUNCTION public.reject_ended_stream_updates()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF OLD.status = 'ended' THEN
    RAISE EXCEPTION 'Ended streams cannot be modified' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS reject_ended_stream_updates ON public.streams;
CREATE TRIGGER reject_ended_stream_updates
BEFORE UPDATE ON public.streams
FOR EACH ROW EXECUTE FUNCTION public.reject_ended_stream_updates();

-- Make repeated admin-end actions idempotent (for the new trigger).
CREATE OR REPLACE FUNCTION public.admin_end_stream(_stream_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Not authorized'; END IF;
  UPDATE public.streams
    SET status = 'ended', stream_health = 'ended', ended_at = now(), ended_reason = 'ended_by_admin'
    WHERE id = _stream_id AND status = 'live';
END;
$$;
