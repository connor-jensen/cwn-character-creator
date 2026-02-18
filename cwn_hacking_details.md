# Cities Without Number: Hacking Metadata and Mechanics

## Hacking Statistic Calculations

### Access Pool
A hacker’s maximum Access pool is equal to their Intelligence modifier plus their Program skill level plus their cyberdeck’s Bonus Access rating. This pool represents the number of backdoors and exploits prepared for a given day. The pool is refreshed by spending one hour reprogramming the cyberdeck, which can only be done once per day.

### Base Hacking Bonus
When rolling hacking skill checks, the character rolls 2d6 and adds their Intelligence modifier and their Program skill level.

### Situational Modifiers
*   **Interface Link:** If using a VR crown instead of a cranial jack, the hacker takes a -1 penalty to all cyberspace skill checks.
*   **Connection Type:** Physical connections established via a self-adhering field modulation cable have no penalty. Wireless connections established within 30 meters of a target with an unobstructed line of sight take a -2 penalty to all cyberspace skill checks.

---

## Hardware Metadata

### Interface Equipment
| Item | Cost | Encumbrance | System Strain | Description |
| :--- | :--- | :--- | :--- | :--- |
| **VR Crown** | $50 | 1 | 0 | A cheap headset for a VR addict or a hacker too poor for a cranial jack. Imposes a -1 penalty to all cyberspace skill checks made with it. |
| **Cranial Jack** | $1,000 | 0 | 0.25 | A discreetly-placed plug socket in the user’s head or neck allows interfacing with cyberdecks and gear equipped with a jack line. Removes the -1 VR crown penalty. |

### Cyberdeck Statistics
| Deck | Cost | Bonus Access | Memory | Shielding | CPU | Encumbrance |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Scrap Cyberdeck** | $500 | 1 | 8 | 5 | 2 | 1 |

---

## Program Subjects
Descriptions sourced from page 97.

| Subject | Cost | Type | Description |
| :--- | :--- | :--- | :--- |
| **Avatar** | $500 | Avatar | A cyberspace avatar, whether one adopted by a hacker who’s jacked into the network or a Demon program standing guard there. |
| **Barrier** | $1,000 | Data | A network node barrier that blocks avatars from passing through a network connection. |
| **Camera** | $500 | Device | Any device that transmits audiovisual information. Some defensive hardware has its own onboard camera, which is susceptible to this target, while others rely on a separate device’s input. |
| **Cyber** | $1,000 | Cyber | A cybernetic system in a visible subject within 30 meters with no significant obstacles to line of sight. Unlike most Subjects, it’s not necessary for a hacker to manifest an avatar inside the target node to affect cyber systems; they can launch their program directly at it, and the system itself need not be visible on the target’s body. |
| **Datafile** | $500 | Data | A datafile stored within a cyberspace location. While individual files may have very little actual data in them, the autoencryption functions and anti-tamper code they’re wrapped in almost always take up a full unit of Memory per file. |
| **Door** | $500 | Device | A physical door, shutter, hatch, or other barrier with an electronic lock or opening mechanism. |
| **Drone** | $1,000 | Device | A remote-controlled drone. The base difficulty is equal to 7 plus the operator’s level or HD/3, rounded up, or 8 if it’s not actively controlled. Like the Cyber Subject, it is not necessary to manifest in a drone’s node to hack it wirelessly. |
| **Machine** | $500 | Device | Security panels, factory machinery, electronic minefields, or any other hackable device not covered under an existing Subject. Its generality applies a +1 penalty to the security difficulty. |
| **Program** | $500 | Program | A hostile program, used most often with the Terminate verb to end the effects of an enemy hacker’s programs prematurely. |
| **Sensor** | $500 | Device | Similar to the Camera element, this code block handles sensors of any kind, regardless of what they are intended to detect. The generality of the element decreases its efficiency, however, and it applies a +1 security difficulty penalty. |
| **Transmission** | $1,000 | Data | Ambient radio transmissions can be affected with this element, most often for the purpose of tampering with local comms. A hacker need not be jacked into a cyberspace node to target local radio transmissions, but the usual -2 check penalty for wireless hacking applies. |
| **Turret** | $1,000 | Device | A security turret, emplaced gun, or other fixed automated weapon. |

---

## Program Verbs
Descriptions sourced from pages 98-99.

| Verb | Cost | Targets Allowed | Access Cost | Skill Check Modifier | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Activate** | $1,000 | Device/Cyber | 1* | +1 | Turn a device or piece of cyberware on. You can’t control it or direct its function, but if it’s programmed to do something when activated, such as grant a bonus action in exchange for System Strain, it does it for one round or one action. The spasmodic activation of cyber outside of the wearer’s turn is unlikely to do anything useful, but it eats System Strain as usual if relevant. |
| **Analyze** | $500 | Device/Data | 0* | +1 | Identify the specific functionality of a device or the general topics of local datafiles. Hackers get a general idea of what kind of device a cyberspace node represents, but Analyze is needed to give specific details of where a device is in reality. |
| **Append** | $500 | Data | 1* | +0 | Add a new entry or new data into a file. These new entries can’t overwrite or erase any existing data, however. |
| **Blind** | $2,000 | Device/Cyber | 1 | +0 | Deactivate a device’s sensory input or make cyberware temporarily unable to get any input from anything but the wearer’s nervous system. Cybereyes are blind, cameras sense nothing, and laser tripwires don’t register the beam. Blind characters can’t effectively attack at range, their movement rate is halved, and they suffer a -4 penalty to both AC and melee hit rolls. |
| **Deactivate** | $2,000 | Device/Cyber | 1* | +1 | Turn a device or piece of cyberware off. Most devices and cyber can be rebooted by the network or the user, but it’ll take a Main Action and a round to do so. If a network alert hasn’t been issued, the network may not notice a deactivated device until someone spots the problem. |
| **Decrypt** | $1,000 | Data | 1* | +0 | Decrypt a data file or radio transmission. This is often automatic for civilian encoding, though some files take Int/Program checks. |
| **Defend** | $1,000 | Device/Cyber | 0 | N/A | A special Verb that can only be targeted at a friendly device or allied cyberware user with in range, and costs no Access to use. While the program remains running, any hostile hacking attempts aimed at that device or any of the target’s cyber systems must first beat the user in an opposed Int/Program skill check before they can attempt their hack. This Verb cannot negate programs that are already running on the target. |
| **Delude** | $5,000 | Device | 1 | -1 | Spoof a device with false sensor input. A camera can be made to record nonexistent scenes, a minefield can be made to see phantom intrusions, a drone can feed the operator false visuals, and a turret can be made to mistake friends for foes. This Verb can’t control a device directly, however, and must rely on feeding it false sensor data. |
| **Erase** | $500 | Data | 1* | +1 | Erase a data file. This Verb is extremely thorough, and any on-site backups can be expected to be nuked as well, either immediately or as soon as the automatic backup protocols expose them. |
| **Frisk** | $500 | Cyber | 0* | +1 | A Frisk Cyber program can give a list of all the cyber implanted in a specific human target within 30 meters, assuming the hacker’s skill check beats the cyber user’s security difficulty. |
| **Ghost** | $2,000 | Avatar | 1 | +0 | Renders the targeted friendly avatar or Demon “invisible” until they take some cyberspace action other than Move Nodes. Observers in a node get an automatic opposed Int/Program check to detect a ghosted avatar’s presence, ending the program. |
| **Glitch** | $1,000 | Device/Cyber | 0 | +2 | Temporarily deactivate a device or cyberware system while the program remains running, for no more than one round per Program skill level plus two. A device can be targeted by a particular hacker’s Glitch only once a day, successful or not. |
| **Hijack** | $5,000 | Device | 1 | -1 | Seize control of a device, operating it as you wish within the limits of its functionality for as long as the program remains running. One command is free with the program’s successful execution; others take a Main Action to issue. |
| **Kill** | $5,000 | Avatar | 1* | +0 | Through forced autonomic feedback and out-of-bounds electrical current parameters, inflict lethal damage to an enemy avatar equal to 1d10 per Program skill level, to a minimum of 1d10 on a successful opposed Int/Program skill check. This damage has a Trauma Die of 1d8 and a x3 Trauma Rating. The victim’s Trauma Target is not modified by armor, but it is by cyber or other modifiers. Unconscious hackers cannot resist this Verb and will be instantly killed by it. This Verb has no effect on Demons. |
| **Lock** | $1,000 | Device/Data | 1 | +1 | Lock a physical device that has some sort of electronic locking mechanism or a currently-unlocked cyberspace node barrier. |
| **Paralyze** | $2,000 | Avatar | 1 | -1 | On a successful opposed Int/Program skill check against the target, render a Demon or avatar incapable of moving out of a node or using the Alert the Network or Send Message actions while the program is running. Other cyberspace actions can be taken normally. Human hackers are also physically paralyzed while the program runs, incapable of moving in meatspace until the connection is cut or the program ends. |
| **Replace** | $1,000 | Data | 1* | +0 | Edit a data file, changing one piece of data in it into another of the hacker’s choice. It cannot erase or add data outright, only alter it. |
| **Sabotage** | $2,000 | Device/Cyber | 1* | -1 | Cause a physical device or cyberware system to damage itself through violent movement or self-destructive current surges. Devices smaller than a car will usually be disabled until repaired. Cyberware users do not take damage, but must make two Physical saves to resist the effect; if they fail both, the targeted system is disabled until the next maintenance, and if they fail one, it’s frozen for one round. A device or cyber can be targeted by this Verb only once per scene. |
| **Sense** | $1,000 | Device/Cyber | 0 | +0 | Piggyback on the sensory feed of a device or piece of cyber. Anything the device senses or records, the hacker can sense. Swapping focus from cyberspace to reality is an On Turn action. |
| **Siege** | $2,500 | Device | 1 | -2 | If a Device is successfully Sieged, its network connections are severed for everyone but the hacker, blocking transit, data, or drone control. Defenders can run Terminate Program against it from any adjacent node. |
| **Silence** | $1,000 | Avatar | 1 | +1 | The affected avatar or Demon is unable to use the Send Message cyberspace action while this program runs. Alert the Network can still be done. |
| **Stun** | $1,000 | Avatar | 0* | +1 | Disrupt an avatar or Demon with sensory glitching, non-lethal current surges, and code corruption. Make an Int/Program skill check; beat an opposed Int/Program check for a human target, or a static 8+skill bonus target for a Demon. The target takes 1d10 non-lethal damage per Program level, to a minimum of 1d10. |
| **Terminate** | $500 | Program | 1* | +0 | Prematurely end an undesired program. Any damage or changes the program already inflicted are unaffected. |
| **Unlock** | $500 | Device/Data | 1* | +1 | Unlock a physical device with an electronic lock or a network’s cyberspace node barrier. |

\* These verbs are self-terminating, and return their CPU slot immediately after the program is run.