-- Default participants
insert into participants (name) values
  ('Sahitya'),
  ('Dheeraj')
on conflict (name) do nothing;

-- Editable bet amount rules
-- RCB or CSK => 200
-- MI or PBKS => 150
-- All other matches => 100 (default fallback)
insert into bet_amount_rules (rule_name, teams, amount, priority, is_default, is_active) values
  ('Premium teams', array['RCB','CSK'], 200, 1, false, true),
  ('Mid-tier teams', array['MI','PBKS'], 150, 2, false, true),
  ('Default IPL amount', '{}'::text[], 100, 999, true, true)
on conflict do nothing;

-- Preload the full IPL fixture list as scheduled matches
insert into matches (
  match_no,
  match_date,
  team1,
  team2,
  venue,
  match_time,
  stage,
  status
) values
  (1, DATE '2026-03-28', 'RCB', 'SRH', 'Bengaluru', TIME '19:30', 'League', 'scheduled'),
  (2, DATE '2026-03-29', 'MI', 'KKR', 'Mumbai', TIME '19:30', 'League', 'scheduled'),
  (3, DATE '2026-03-30', 'RR', 'CSK', 'Guwahati', TIME '19:30', 'League', 'scheduled'),
  (4, DATE '2026-03-31', 'PBKS', 'GT', 'New Chandigarh', TIME '19:30', 'League', 'scheduled'),
  (5, DATE '2026-04-01', 'LSG', 'DC', 'Lucknow', TIME '19:30', 'League', 'scheduled'),
  (6, DATE '2026-04-02', 'KKR', 'SRH', 'Kolkata', TIME '19:30', 'League', 'scheduled'),
  (7, DATE '2026-04-03', 'CSK', 'PBKS', 'Chennai', TIME '19:30', 'League', 'scheduled'),
  (8, DATE '2026-04-04', 'DC', 'MI', 'Delhi', TIME '15:30', 'League', 'scheduled'),
  (9, DATE '2026-04-04', 'GT', 'RR', 'Ahmedabad', TIME '19:30', 'League', 'scheduled'),
  (10, DATE '2026-04-05', 'SRH', 'LSG', 'Hyderabad', TIME '15:30', 'League', 'scheduled'),
  (11, DATE '2026-04-05', 'RCB', 'CSK', 'Bengaluru', TIME '19:30', 'League', 'scheduled'),
  (12, DATE '2026-04-06', 'KKR', 'PBKS', 'Kolkata', TIME '19:30', 'League', 'scheduled'),
  (13, DATE '2026-04-07', 'RR', 'MI', 'Guwahati', TIME '19:30', 'League', 'scheduled'),
  (14, DATE '2026-04-08', 'DC', 'GT', 'Delhi', TIME '19:30', 'League', 'scheduled'),
  (15, DATE '2026-04-09', 'KKR', 'LSG', 'Kolkata', TIME '19:30', 'League', 'scheduled'),
  (16, DATE '2026-04-10', 'RR', 'RCB', 'Guwahati', TIME '19:30', 'League', 'scheduled'),
  (17, DATE '2026-04-11', 'PBKS', 'SRH', 'New Chandigarh', TIME '15:30', 'League', 'scheduled'),
  (18, DATE '2026-04-11', 'CSK', 'DC', 'Chennai', TIME '19:30', 'League', 'scheduled'),
  (19, DATE '2026-04-12', 'LSG', 'GT', 'Lucknow', TIME '15:30', 'League', 'scheduled'),
  (20, DATE '2026-04-12', 'MI', 'RCB', 'Mumbai', TIME '19:30', 'League', 'scheduled'),
  (21, DATE '2026-04-13', 'SRH', 'RR', 'Hyderabad', TIME '19:30', 'League', 'scheduled'),
  (22, DATE '2026-04-14', 'CSK', 'KKR', 'Chennai', TIME '19:30', 'League', 'scheduled'),
  (23, DATE '2026-04-15', 'RCB', 'LSG', 'Bengaluru', TIME '19:30', 'League', 'scheduled'),
  (24, DATE '2026-04-16', 'MI', 'PBKS', 'Mumbai', TIME '19:30', 'League', 'scheduled'),
  (25, DATE '2026-04-17', 'GT', 'KKR', 'Ahmedabad', TIME '19:30', 'League', 'scheduled'),
  (26, DATE '2026-04-18', 'RCB', 'DC', 'Bengaluru', TIME '15:30', 'League', 'scheduled'),
  (27, DATE '2026-04-18', 'SRH', 'CSK', 'Hyderabad', TIME '19:30', 'League', 'scheduled'),
  (28, DATE '2026-04-19', 'KKR', 'RR', 'Kolkata', TIME '15:30', 'League', 'scheduled'),
  (29, DATE '2026-04-19', 'PBKS', 'LSG', 'New Chandigarh', TIME '19:30', 'League', 'scheduled'),
  (30, DATE '2026-04-20', 'GT', 'MI', 'Ahmedabad', TIME '19:30', 'League', 'scheduled'),
  (31, DATE '2026-04-21', 'SRH', 'DC', 'Hyderabad', TIME '19:30', 'League', 'scheduled'),
  (32, DATE '2026-04-22', 'LSG', 'RR', 'Lucknow', TIME '19:30', 'League', 'scheduled'),
  (33, DATE '2026-04-23', 'MI', 'CSK', 'Mumbai', TIME '19:30', 'League', 'scheduled'),
  (34, DATE '2026-04-24', 'RCB', 'GT', 'Bengaluru', TIME '19:30', 'League', 'scheduled'),
  (35, DATE '2026-04-25', 'DC', 'PBKS', 'Delhi', TIME '15:30', 'League', 'scheduled'),
  (36, DATE '2026-04-25', 'RR', 'SRH', 'Jaipur', TIME '19:30', 'League', 'scheduled'),
  (37, DATE '2026-04-26', 'GT', 'CSK', 'Ahmedabad', TIME '15:30', 'League', 'scheduled'),
  (38, DATE '2026-04-26', 'LSG', 'KKR', 'Lucknow', TIME '19:30', 'League', 'scheduled'),
  (39, DATE '2026-04-27', 'DC', 'RCB', 'Delhi', TIME '19:30', 'League', 'scheduled'),
  (40, DATE '2026-04-28', 'PBKS', 'RR', 'New Chandigarh', TIME '19:30', 'League', 'scheduled'),
  (41, DATE '2026-04-29', 'MI', 'SRH', 'Mumbai', TIME '19:30', 'League', 'scheduled'),
  (42, DATE '2026-04-30', 'GT', 'RCB', 'Ahmedabad', TIME '19:30', 'League', 'scheduled'),
  (43, DATE '2026-05-01', 'RR', 'DC', 'Jaipur', TIME '19:30', 'League', 'scheduled'),
  (44, DATE '2026-05-02', 'CSK', 'MI', 'Chennai', TIME '19:30', 'League', 'scheduled'),
  (45, DATE '2026-05-03', 'SRH', 'KKR', 'Hyderabad', TIME '15:30', 'League', 'scheduled'),
  (46, DATE '2026-05-03', 'GT', 'PBKS', 'Ahmedabad', TIME '19:30', 'League', 'scheduled'),
  (47, DATE '2026-05-04', 'MI', 'LSG', 'Mumbai', TIME '19:30', 'League', 'scheduled'),
  (48, DATE '2026-05-05', 'DC', 'CSK', 'Delhi', TIME '19:30', 'League', 'scheduled'),
  (49, DATE '2026-05-06', 'SRH', 'PBKS', 'Hyderabad', TIME '19:30', 'League', 'scheduled'),
  (50, DATE '2026-05-07', 'LSG', 'RCB', 'Lucknow', TIME '19:30', 'League', 'scheduled'),
  (51, DATE '2026-05-08', 'DC', 'KKR', 'Delhi', TIME '19:30', 'League', 'scheduled'),
  (52, DATE '2026-05-09', 'RR', 'GT', 'Jaipur', TIME '19:30', 'League', 'scheduled'),
  (53, DATE '2026-05-10', 'CSK', 'LSG', 'Chennai', TIME '15:30', 'League', 'scheduled'),
  (54, DATE '2026-05-10', 'RCB', 'MI', 'Raipur', TIME '19:30', 'League', 'scheduled'),
  (55, DATE '2026-05-11', 'PBKS', 'DC', 'Dharamshala', TIME '19:30', 'League', 'scheduled'),
  (56, DATE '2026-05-12', 'GT', 'SRH', 'Ahmedabad', TIME '19:30', 'League', 'scheduled'),
  (57, DATE '2026-05-13', 'RCB', 'KKR', 'Raipur', TIME '19:30', 'League', 'scheduled'),
  (58, DATE '2026-05-14', 'PBKS', 'MI', 'Dharamshala', TIME '19:30', 'League', 'scheduled'),
  (59, DATE '2026-05-15', 'LSG', 'CSK', 'Lucknow', TIME '19:30', 'League', 'scheduled'),
  (60, DATE '2026-05-16', 'KKR', 'GT', 'Kolkata', TIME '19:30', 'League', 'scheduled'),
  (61, DATE '2026-05-17', 'PBKS', 'RCB', 'Dharamshala', TIME '15:30', 'League', 'scheduled'),
  (62, DATE '2026-05-17', 'DC', 'RR', 'Delhi', TIME '19:30', 'League', 'scheduled'),
  (63, DATE '2026-05-18', 'CSK', 'SRH', 'Chennai', TIME '19:30', 'League', 'scheduled'),
  (64, DATE '2026-05-19', 'RR', 'LSG', 'Jaipur', TIME '19:30', 'League', 'scheduled'),
  (65, DATE '2026-05-20', 'KKR', 'MI', 'Kolkata', TIME '19:30', 'League', 'scheduled'),
  (66, DATE '2026-05-21', 'CSK', 'GT', 'Chennai', TIME '19:30', 'League', 'scheduled'),
  (67, DATE '2026-05-22', 'SRH', 'RCB', 'Hyderabad', TIME '19:30', 'League', 'scheduled'),
  (68, DATE '2026-05-23', 'LSG', 'PBKS', 'Lucknow', TIME '19:30', 'League', 'scheduled'),
  (69, DATE '2026-05-24', 'MI', 'RR', 'Mumbai', TIME '15:30', 'League', 'scheduled'),
  (70, DATE '2026-05-24', 'KKR', 'DC', 'Kolkata', TIME '19:30', 'League', 'scheduled')
on conflict (match_no) do nothing;