CREATE TABLE public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'todo' CHECK (status IN ('todo','progress','completed')),
  position double precision NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tasks TO anon, authenticated;
GRANT ALL ON public.tasks TO service_role;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public tasks all" ON public.tasks FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.chat_messages TO anon, authenticated;
GRANT ALL ON public.chat_messages TO service_role;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public chat all" ON public.chat_messages FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

INSERT INTO public.tasks (title, description, status, position) VALUES
('Design task card component','Create a reusable card for the board','todo',1),
('Write onboarding guide','Short guide to help new users get started','todo',2),
('Set up project API','Initial endpoints for managing tasks','progress',1),
('Fix login redirect issue','Users are not redirected after sign in','progress',2),
('Design homepage hero','New hero layout for the landing page','completed',1);