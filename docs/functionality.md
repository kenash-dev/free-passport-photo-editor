# Passport Photo Maker: Functionality

Oct 8, 2026 · @bot

## Overview

The app turns one photo the user already has into a print-ready, country-compliant passport photo, and the photo never leaves the user's browser. There is no account, no upload to a server and no payment step.

The user moves through five steps:

1. **Upload** a photo (or take one with the device camera).
2. **Check**: the app tells the user whether the photo can be used, and why not if it can't.
3. **Choose a country** from a short list.
4. **Review** the photo the app produced for that country, with small manual adjustments.
5. **Download** a single photo, or a sheet of photos laid out for printing.

_(The user-flow diagram is embedded in the online doc and is not included in this export.)_

A photo that fails the check goes back to upload with the reason; a photo with only warnings carries on, and both download options start from the same adjusted photo.

## 1. Photo upload

The user gives the app one photo, either by picking a file or by taking one with the camera.

- **Ways in:** file picker, drag and drop onto the page, paste from clipboard, and the device camera (front or back) where the browser allows it.
- **Formats:** JPEG, PNG, WebP and HEIC (iPhone photos). Anything else is rejected with a message naming the accepted formats.
- **Size:** files up to 20 MB are accepted. Very large images are scaled down for processing, but the final photo is cut from the full-resolution original.
- **Orientation:** the app reads the photo's orientation tag so phone photos are not shown sideways.
- **One photo at a time:** uploading a new photo replaces the current one and restarts from step 2.
- **Camera guidance:** when the camera is used, an on-screen face outline shows where to position the head, plus tips (face the camera, neutral expression, even light, plain wall behind).
- **Replace any time:** a "Use a different photo" action is available at every step.

## 2. Photo suitability check

Right after upload, the app checks whether a passport photo can be made from this photo and gives a clear verdict before the user picks a country. Each check returns one of three results:

- **Pass:** fine as is.
- **Warning:** usable, but the result may be rejected by the passport office. The user can continue.
- **Fail:** a passport photo cannot be made. The user is asked for a different photo, with the reason and a tip to fix it.

| Check | Fail when | Warning when | Tip shown to the user |
| --- | --- | --- | --- |
| One face | No face, or more than one face |  | Use a photo with only you in it |
| Face fully in frame | Top of head or chin is cut off | Shoulders are cut off | Leave space above your head and below your chin |
| Resolution | Face too small to reach the country's minimum print size at 300 DPI | Close to the minimum | Move closer to the camera or use a higher-quality photo |
| Facing the camera | Head turned or tilted strongly | Slight turn or tilt | Look straight at the camera |
| Eyes | Eyes closed | Eyes partly covered (hair, glare on glasses) | Open your eyes and keep hair off your face |
| Expression |  | Mouth open or big smile | Keep a neutral expression, mouth closed |
| Sharpness | Very blurry | Slightly soft | Hold the camera steady in good light |
| Lighting | Face too dark or blown out | Uneven light or strong shadows on the face | Face a window or a soft light source |
| Background |  | Busy background that may not separate cleanly | Stand in front of a plain wall |
| Head covering, glasses |  | Sunglasses, hat, or tinted glasses detected | Remove them unless allowed for religious or medical reasons |

The check runs again after the country is chosen, because some limits (minimum resolution, glasses rules) depend on the country. The user sees the results as a short checklist, worst result first.

## 3. Country selection

The user picks one country from a short list; that choice sets every size, position and background rule the app applies. The first release supports six countries. The figures below are approximate, from memory, and must be checked against each government's official guidance before release.

| Country | Photo size | Head height (chin to crown) | Background | Glasses |
| --- | --- | --- | --- | --- |
| United States | 51 x 51 mm (2 x 2 in) | 25 to 35 mm | White or off-white | Not allowed |
| United Kingdom | 35 x 45 mm | 29 to 34 mm | Plain cream or light grey | Not recommended |
| India | 35 x 45 mm | About 80% of the photo height | White | Allowed if no glare |
| Canada | 50 x 70 mm | 31 to 36 mm | White or light-coloured | Allowed if no glare |
| Australia | 35 x 45 mm | 32 to 36 mm | Plain white or light grey | Not allowed |
| Schengen countries (EU) | 35 x 45 mm | 32 to 36 mm | Light grey or light blue | Allowed if no glare |

- The list is searchable and shows each country's flag and photo size.
- The app remembers the last country chosen on that device.
- Each country's rules live in one place so a new country can be added without changing the editing steps.
- Changing the country after the photo is made re-applies the new rules to the same uploaded photo; the user does not upload again.

## 4. Image alteration for the chosen country

Once a country is chosen, the app automatically turns the photo into one that meets that country's rules. The user does nothing in this step except wait a moment.

1. **Straighten:** rotate so the eyes are level.
2. **Replace the background:** separate the person from the background and fill it with the country's background colour, keeping hair edges natural.
3. **Crop and scale:** size the head so chin-to-crown height falls in the middle of the country's allowed range, and place it at the required position (centred, with the required space above the head).
4. **Correct light and colour:** gently even out exposure and white balance. The app does not smooth skin, reshape the face or apply filters, since passport offices reject retouched photos.
5. **Resize for output:** produce the photo at the country's exact print size at 300 DPI, plus a digital copy where the country also has an online-application size.

After the alteration the suitability check runs again on the result, and any new warnings (for example, not enough space above the head) are shown next to the photo.

## 5. Preview, adjust and download

The user sees the finished photo at its true proportions and can fine-tune it before downloading.

- **Guide overlay:** a toggle shows the country's head-height range and eye line on top of the photo, so the user can see that it fits.
- **Before and after:** a toggle compares the result with the original upload.
- **Manual adjustments:** zoom (head size), move up, down, left and right, rotate a few degrees, and brightness. Adjustments are limited so the photo cannot leave the country's allowed range; going past a limit shows a warning.
- **Background touch-up:** if the background removal missed an area (for example, around hair), a simple brush lets the user mark areas to keep or remove.
- **Reset:** returns to the automatic result.
- **Download single photo:** JPEG at the exact print size and 300 DPI, and the digital-application size where the country has one. The file name includes the country and size, for example `passport-photo-UK-35x45mm.jpg`.

## 6. Print grid

The user can download a sheet with as many copies of the photo as fit on a common paper size, ready to print at home or at a photo shop and cut out.

- **Paper sizes:** 4 x 6 in (10 x 15 cm photo print), 5 x 7 in, A4 and US Letter. 4 x 6 in is the default, since photo shops print it cheaply.
- **Automatic layout:** the app fits the most copies the paper allows, with a small gap between photos where there is room (edge to edge with shared cut lines where there isn't), and picks portrait or landscape to fit more. For example, a 4 x 6 in sheet holds 6 US photos (2 x 2 in, edge to edge) or 8 UK photos (35 x 45 mm).
- **Number of copies:** the user can lower the count (for example, only 4); empty spaces stay blank.
- **Cut guides:** thin cut lines or corner marks around each photo, on by default, can be turned off.
- **Live preview:** the sheet is shown on screen with its paper size and copy count before download.
- **Export:** JPEG for photo-shop printing and PDF for home printing, both at 300 DPI and at exact physical size.
- **Print tip:** a short note reminds the user to print at 100% scale ("actual size"), not "fit to page", or the photos will come out the wrong size.

## 7. Privacy and offline use

Every step happens on the user's device; the photo is never sent anywhere.

- No photo, face data or result is uploaded, stored on a server or shared with third parties.
- The app keeps the photo only in the open browser tab. Closing or refreshing the tab discards it, and a "Clear photo" action removes it immediately.
- After the first visit has loaded, the app keeps working without an internet connection.
- The page states this plainly near the upload area ("Your photo stays on your device") so users trust it with a picture of their face.
- The app collects no analytics that include image content.

## 8. Out of scope and open questions

Not in the first release: visa photos and other ID documents (driving licences, residence cards), batch processing of several people, printing or shipping service, user accounts, and a guarantee that a government will accept the photo.

- [ ] Is the six-country list right, and which countries come next?
- [ ] Verify each country's size, head height and background rules against the official government pages.
- [ ] Should the app also make photos for online applications that use different pixel sizes (for example, US 600 x 600 px)?
- [ ] Should a failed suitability check block the user, or only warn them and let them continue at their own risk?
- [ ] Does the app need to work on low-end phones, which affects how heavy the face and background processing can be?
