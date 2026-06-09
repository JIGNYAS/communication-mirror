# Product Requirements Document (PRD): "The Communication Mirror"

## 1. Executive Summary
"The Communication Mirror" is a mobile application designed to democratize communication coaching. Unlike apps that focus solely on language learning or vocabulary, this app targets delivery and self-awareness.

The core philosophy is that "you cannot improve what you cannot see". The app utilizes the "Mirror Method"—recording video, reviewing it through isolated sensory channels (auditory vs. visual), and applying AI analysis based on the "5 Core Foundations" of voice. It aims to shift users from unconscious incompetence to conscious competence.

## 2. User Personas

* 
**The Job Seeker:** Needs to ace interviews; struggles with "tell me about yourself" questions.


* 
**The Professional/Leader:** Wants to sound more authoritative in meetings; suffers from "imposter syndrome" or a quiet voice.


* 
**The ESL Speaker:** Wants to improve articulation and pronunciation to feel more confident in professional settings.


## 3. Functional Requirements

### Module A: Onboarding & The Diagnostic (The "Mirror")

**Goal:** Establish a baseline and break the user's fear of the camera.

* **Feature 1: The 5-Question Impromptu Test**
* 
**Logic:** The user must record a continuous 5-minute video answering 5 specific prompts without preparation.


* **Prompts:**
"Finish this sentence: My name is... and I'm recording this to improve my communication skills because..."
"What do you do in your free time?"
"Who is your best friend and why?"
"What is your favorite food and why?"
"If you could have one superpower, what would it be and why?"
* **Constraint:** The "No Restart" Policy. The recording cannot be paused or restarted. We want "imperfections".




* **Feature 2: The 24-Hour Lock**
* **Logic:** After recording, the video is locked for 24 hours.
* **Reasoning:** Users are too self-critical immediately after recording. Waiting 24 hours allows them to be "kinder" and more objective.




* **Feature 3: The Goal Setting (5 Words)**
* 
**Input:** User inputs 5 adjectives they *want* people to use to describe them (e.g., "Charismatic," "Credible," "Playful").


* **Usage:** These words become the rubric for future self-reviews.



### Module B: The Review Dashboard (The Analysis)

**Goal:** Review communication through isolated senses to identify "non-functional behaviors".

* **Feature 1: Auditory Review Mode (Blind Listen)**
* 
**Action:** Plays audio only; video is blacked out.


* 
**User Task:** User listens for vocal quality and rates if they hit their "5 Words" goals.




* **Feature 2: Visual Review Mode (Mute Watch)**
* 
**Action:** Plays video only; audio is muted.


* 
**User Task:** User tags "non-functional behaviors" (fidgeting, hair playing, rocking back and forth).




* **Feature 3: Transcript & Syntax Mode**
* 
**Action:** Displays full speech-to-text transcript.


* 
**AI Analysis:** Highlights "Non-words" (um, uh) vs. "Filler words" (like, you know).


* 
**Grammar Check:** For ESL users, specifically flags tense errors (past vs. future).





### Module C: The AI Coach (Real-time Feedback)

**Goal:** Analyze the "5 Core Foundations" of voice.

* **Metric 1: Rate of Speech (Pace)**
* **Analysis:** Measures Words Per Minute (WPM). Flags "Static Rate" (boring) vs. "Variable Rate" (engaging).
* 
**Advice:** Suggests "Slowing down to highlight" key points.




* **Metric 2: Volume (Projection)**
* **Analysis:** Measures decibel levels against a calibrated baseline.
* 
**Target:** Checks if user is at "Level 3" (conversation) vs. the ideal "Level 5" (presentation/room-filling).




* **Metric 3: Pitch & Melody**
* **Analysis:** Measures Hz variance.
* 
**Flags:** "Monotone" (using 1-2 keys) vs. "Melodic" (using the "88 keys" concept).


* 
**Cadence Check:** Detects "Uptalk" (ending statements with a rising pitch like a question) and suggests ending on a lower pitch for authority.




* **Metric 4: Pausing (White Space)**
* **Analysis:** Detects silence duration.
* 
**Flags:** "Rambling" (no pauses) vs. "Composed" (pausing for effect).





### Module D: Practice Gym (Gamified Exercises)

**Goal:** Daily "reps" to strengthen the mind-mouth connection.

* **Feature 1: The Random Word Generator**
* **Mechanic:** Displays a random word (e.g., "Grave," "Monkey").
* **Task:** User must speak on that word for 60 seconds instantly.
* 
**Goal:** Train the "Mind-to-Mouth Connection" to prevent "lagging" or "blanking" during interviews.




* **Feature 2: Framework Builder**
* **Mechanic:** Users input a complex topic (e.g., "Project Delay").
* 
**AI Template:** Reshapes their input into the **CCC Framework** (Context, Core, Connect) or **3-2-1 Framework**.




* **Feature 3: Vocal Warm-up Studio**
* **Guided Audio:** 5-minute pre-meeting routine.
* **Exercises:**
* 
*Lip Trills/Flutters:* To warm up articulators.


* 
*The Siren:* Sliding from low to high pitch to increase range.


* 
*The Chewing Gum:* Exaggerated jaw movement to release tension.






* **Feature 4: The Color Profiler**
* 
**Quiz:** A logic flow determining if the user is **Red** (Dominant), **Yellow** (Influential), **Green** (Steady), or **Blue** (Analytical).


* 
**Output:** Tailored advice (e.g., "You are Red. Warning: You may seem abrasive to Green colleagues. Slow down.").




## 4. User Flow Design
**Welcome:** "The World is a Stage" Splash Screen.

Calibration: "Let's find your voice." (Microphone calibration for Volume Levels 1-10).
The Diagnostic: 5-Question Video Recording (No Pause/Restart).
**The Wait:** "Great job. We are locking this video for 24 hours to let your self-criticism fade.".

The Analysis (Day 2): User completes the 3-Mode Review (Audit/Visual/Transcript).
**The Training Plan:** App generates a "4-Week Plan" based on the analysis (e.g., Week 1: Pausing, Week 2: Volume).


## 5. Non-Functional Requirements

* **Privacy:** All video processing must happen on-device or be end-to-end encrypted. The user is recording vulnerable moments.
* **Latency:** The "Random Word Generator" must load instantly to simulate pressure.
* **Accessibility:** High contrast text for transcripts; visual waveforms for the hard of hearing.
## 6. Success Metrics (KPIs)

* 
**Mind-Mouth Latency:** Reduction in "um/ah" count over 30 days.


* **Dynamic Range:** Increase in pitch variance (Hz range) over time.
* 
**Streak:** Consecutive days using the Random Word Generator.