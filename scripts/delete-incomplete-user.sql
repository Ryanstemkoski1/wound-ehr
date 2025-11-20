-- Delete the incomplete MD test user registration

-- Step 1: Find the user that was created
SELECT id, email, created_at
FROM auth.users
WHERE email LIKE '%md%' OR email LIKE '%test%'
ORDER BY created_at DESC
LIMIT 5;

-- Step 2: Delete the incomplete user (run after confirming email above)
-- Uncomment the line below and replace with the actual email:

DELETE FROM auth.users WHERE email = 'YOUR_EMAIL_HERE';

-- Step 3: Verify deletion
SELECT id, email FROM auth.users WHERE email = 'YOUR_EMAIL_HERE';
