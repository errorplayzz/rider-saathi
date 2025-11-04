# Achievement System Setup & Usage Guide

## Overview
This achievement system tracks user activities and rewards them with unlockable achievements. Each achievement has progress tracking, tiers (bronze, silver, gold, platinum, diamond), and reward points.

---

## 📋 Setup Instructions

### Step 1: Run the SQL Setup
Execute the SQL file to set up the achievement system in your Supabase database:

```sql
-- Run this file in your Supabase SQL Editor
sql_backups/SETUP_ACHIEVEMENTS.sql
```

This will:
- ✅ Create the `achievements` table (if not exists)
- ✅ Create the `achievement_definitions` table
- ✅ Seed 25+ predefined achievements across 5 categories
- ✅ Create helper functions for tracking progress
- ✅ Set up RLS policies
- ✅ Auto-initialize achievements for all existing users
- ✅ Create triggers to auto-initialize achievements for new users

### Step 2: Verify Database Tables

After running the SQL, verify these tables exist:

1. **achievement_definitions** - Master list of all possible achievements
2. **achievements** - User-specific achievement progress

You can verify by running:
```sql
SELECT * FROM achievement_definitions ORDER BY sort_order;
SELECT * FROM achievements WHERE user_id = 'YOUR_USER_ID';
```

---

## 🎯 Achievement Categories

### 1. Safety Achievements (🚨🛡️🦸⭐)
- **First Responder** - Respond to your first emergency alert (25 pts)
- **Safety Guardian** - Respond to 5 emergency alerts (75 pts)
- **Hero Responder** - Respond to 10 emergency alerts (150 pts)
- **Emergency Legend** - Respond to 25 emergency alerts (300 pts)

### 2. Community Achievements (🤝🫱👑💎)
- **Helping Hand** - Help 3 fellow riders (30 pts)
- **Community Helper** - Help 10 fellow riders (100 pts)
- **Community Champion** - Help 25 fellow riders (200 pts)
- **Community Legend** - Help 50 fellow riders (400 pts)

### 3. Riding Achievements (🏍️🏁🎖️👾📏🗺️🌍)
- **Rookie Rider** - Complete your first ride (20 pts)
- **Seasoned Rider** - Complete 10 rides (60 pts)
- **Expert Rider** - Complete 50 rides (200 pts)
- **Road Warrior** - Complete 100 rides (500 pts)
- **Kilometer King** - Travel 100km total (80 pts)
- **Distance Master** - Travel 500km total (250 pts)
- **Marathon Rider** - Travel 1000km total (600 pts)

### 4. Environmental Achievements (🌱🌳♻️)
- **Eco Starter** - Practice eco-friendly riding 5 times (40 pts)
- **Eco Warrior** - Practice eco-friendly riding 20 times (120 pts)
- **Green Champion** - Practice eco-friendly riding 50 times (300 pts)

### 5. Social Achievements (🦋👨‍✈️📢💬🗺️)
- **Social Butterfly** - Join 5 group rides (35 pts)
- **Group Leader** - Lead 3 group rides (90 pts)
- **Ride Organizer** - Lead 10 group rides (250 pts)
- **Chat Active** - Send 50 chat messages (25 pts)
- **Route Sharer** - Share 5 useful routes (75 pts)

---

## 🔧 How to Use - Frontend Integration

### Import the Helper Functions
```javascript
import {
  getUserAchievements,
  trackAchievementActivity,
  updateAchievementProgress,
  initializeUserAchievements
} from '../lib/supabaseHelpers'
```

### 1. Display User Achievements
```javascript
// In your component (e.g., Profile.jsx)
const [achievements, setAchievements] = useState([])

useEffect(() => {
  const fetchAchievements = async () => {
    const data = await getUserAchievements(user.id)
    setAchievements(data)
  }
  fetchAchievements()
}, [user.id])

// Display achievements
{achievements.map(achievement => (
  <div key={achievement.id}>
    <div>{achievement.icon}</div>
    <h3>{achievement.title}</h3>
    <p>{achievement.description}</p>
    {achievement.isCompleted ? (
      <span>✓ Completed</span>
    ) : (
      <div>
        Progress: {achievement.progress.current} / {achievement.progress.target}
      </div>
    )}
  </div>
))}
```

### 2. Track Activities

#### When a user responds to an emergency:
```javascript
// In Emergency.jsx or wherever emergency response is handled
const handleEmergencyResponse = async () => {
  // ... your emergency response logic
  
  // Track the activity for achievements
  await trackAchievementActivity(user.id, 'emergency_response')
}
```

#### When a user completes a ride:
```javascript
// In your ride completion handler
const handleRideComplete = async (rideData) => {
  // ... your ride completion logic
  
  // Track ride completion
  await trackAchievementActivity(user.id, 'ride_complete')
  
  // Also track distance if needed
  const distanceKm = rideData.distance / 1000
  await updateAchievementProgress(user.id, 'kilometer_king', distanceKm)
  await updateAchievementProgress(user.id, 'distance_master', distanceKm)
  await updateAchievementProgress(user.id, 'marathon_rider', distanceKm)
}
```

#### When a user sends a chat message:
```javascript
// In Chat.jsx or chat handler
const handleSendMessage = async (message) => {
  // ... send message logic
  
  // Track chat activity
  await trackAchievementActivity(user.id, 'chat_message')
}
```

#### When a user joins a group ride:
```javascript
const handleJoinGroupRide = async () => {
  // ... join group ride logic
  
  await trackAchievementActivity(user.id, 'group_ride_join')
}
```

#### When a user leads a group ride:
```javascript
const handleLeadGroupRide = async () => {
  // ... lead group ride logic
  
  await trackAchievementActivity(user.id, 'group_ride_lead')
}
```

---

## 🎮 Activity Type Reference

Use these activity types with `trackAchievementActivity()`:

| Activity Type | Description | Affects Achievements |
|--------------|-------------|---------------------|
| `emergency_response` | User responds to emergency alert | First Responder, Safety Guardian, Hero Responder, Emergency Legend |
| `help_rider` | User helps another rider | Helping Hand, Community Helper, Community Champion, Community Legend |
| `ride_complete` | User completes a ride | Rookie Rider, Seasoned Rider, Expert Rider, Road Warrior |
| `eco_riding` | User practices eco-friendly riding | Eco Starter, Eco Warrior, Green Champion |
| `group_ride_join` | User joins a group ride | Social Butterfly |
| `group_ride_lead` | User leads a group ride | Group Leader, Ride Organizer |
| `chat_message` | User sends a chat message | Chat Active |
| `route_share` | User shares a route | Route Sharer |

---

## 📊 Database Functions

### Initialize Achievements for a User
```sql
SELECT initialize_user_achievements('USER_UUID_HERE');
```
This is automatically called when a new user signs up (via trigger).

### Track Activity
```sql
SELECT track_achievement_activity('USER_UUID_HERE', 'emergency_response');
```

### Update Specific Achievement Progress
```sql
SELECT update_achievement_progress('USER_UUID_HERE', 'kilometer_king', 10);
-- This adds 10 to the progress (e.g., 10km traveled)
```

### Check User's Achievements
```sql
SELECT * FROM achievements 
WHERE user_id = 'USER_UUID_HERE' 
ORDER BY is_completed DESC, updated_at DESC;
```

---

## 🎨 Frontend Features

### Achievement Card Features:
- ✨ **Visual States**: Locked (grayscale), In Progress, Completed (full color)
- 📊 **Progress Bars**: Shows current progress vs target
- 🏅 **Tier Badges**: Bronze, Silver, Gold, Platinum, Diamond
- 💰 **Reward Points**: Displays points earned/available
- 📅 **Completion Date**: Shows when achievement was unlocked
- 🎯 **Category Organization**: Safety, Community, Riding, Environmental, Social

### Achievement Stats Summary:
- Total unlocked achievements
- Total available achievements
- Total points earned from achievements

---

## 🔐 Security (RLS Policies)

- ✅ Users can view their own achievements
- ✅ Users can view public achievements of others
- ✅ System functions can manage achievements (SECURITY DEFINER)
- ✅ Everyone can view achievement definitions

---

## 🚀 Testing the System

### 1. Test Achievement Display
Visit the Profile page → Achievements tab to see all achievements

### 2. Test Activity Tracking
```javascript
// In browser console or a test button
import { trackAchievementActivity } from './lib/supabaseHelpers'

// Get your user ID from auth context
const userId = 'YOUR_USER_ID'

// Track some activities
await trackAchievementActivity(userId, 'ride_complete')
await trackAchievementActivity(userId, 'emergency_response')
await trackAchievementActivity(userId, 'chat_message')

// Refresh the achievements page to see progress
```

### 3. Manually Complete an Achievement
```sql
-- In Supabase SQL Editor
UPDATE achievements 
SET 
  progress_current = progress_target,
  is_completed = true,
  completed_at = NOW()
WHERE user_id = 'YOUR_USER_ID' 
  AND achievement_id = 'first_responder';
```

---

## 🐛 Troubleshooting

### Issue: Achievements not showing
**Solution**: Run the initialization:
```javascript
await initializeUserAchievements(user.id)
```

### Issue: Progress not updating
**Check**:
1. Verify the activity type is correct
2. Check browser console for errors
3. Verify RLS policies in Supabase
4. Check that functions exist: `SELECT * FROM pg_proc WHERE proname LIKE '%achievement%';`

### Issue: "function does not exist"
**Solution**: Re-run the SETUP_ACHIEVEMENTS.sql file in Supabase SQL Editor

---

## 📈 Adding New Achievements

### 1. Add to achievement_definitions table:
```sql
INSERT INTO achievement_definitions (
  id, name, description, icon, category, tier, 
  target_count, target_unit, reward_points, sort_order
) VALUES (
  'your_achievement_id',
  'Achievement Name',
  'Achievement description',
  '🎯', -- emoji icon
  'category_name', -- safety, community, riding, environmental, social
  'bronze', -- bronze, silver, gold, platinum, diamond
  10, -- target count
  'units', -- e.g., 'rides', 'km', 'helps'
  50, -- reward points
  100 -- sort order
);
```

### 2. Update the tracking function:
Edit the `track_achievement_activity` function to include your new achievement:
```sql
WHEN 'your_activity_type' THEN
    PERFORM update_achievement_progress(p_user_id, 'your_achievement_id', 1);
```

### 3. Refresh existing users' achievements:
```sql
-- This will add the new achievement to all users
DO $$
DECLARE
    user_record RECORD;
BEGIN
    FOR user_record IN SELECT id FROM public.profiles
    LOOP
        PERFORM initialize_user_achievements(user_record.id);
    END LOOP;
END $$;
```

---

## 🎉 Success!

Your achievement system is now fully set up and working! Users will automatically:
- 📥 Get all achievements initialized on signup
- 📊 Track progress as they use the app
- 🏆 Unlock achievements and earn points
- 🎨 See beautiful achievement cards in their profile

**Happy coding! 🚀**
