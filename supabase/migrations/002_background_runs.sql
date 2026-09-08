alter table public.runs add column openai_response_id text unique;

update public.runs
set status = 'failed',
    error = 'Run interrupted before background processing was enabled.',
    finished_at = now()
where status = 'running';
