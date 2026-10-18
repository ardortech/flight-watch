-- Snapshots written by the mock provider are labelled 'mock', so fake prices can never be
-- compared with real Ignav prices in drop detection (SPEC §4, comparison rule).
alter type price_source add value if not exists 'mock';
