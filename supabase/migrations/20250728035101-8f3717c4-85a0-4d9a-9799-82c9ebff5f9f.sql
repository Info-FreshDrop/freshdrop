-- Update the user role for operator@freshdrop.com to be an operator
UPDATE user_roles 
SET role = 'operator' 
WHERE user_id = 'c569fb65-622a-49bd-965c-c9f8f89cb558';