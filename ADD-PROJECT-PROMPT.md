# Prompt: Add a Project to Vibe-rary

Use this prompt with Claude Code when you want to add a new project to the library.
Copy everything between the triple dashes, fill in the blanks, and paste it in.

---

```
I want to add a new project to my Vibe-rary at woodhouse711/web-dashboard.

Here is the project context:
[PASTE OR DESCRIBE YOUR PROJECT HERE — code, a link, a description, screenshots, whatever you have]

Please do the following:

1. Create a folder at projects/{slug}/ with a slug derived from the project title
2. Write meta.json using the PROJECT-SPEC.md contract. Infer:
   - title, description, tags from the project content
   - format based on what the project is built with (html/react/etc.)
   - aspect ratio based on the project's natural shape
   - date as today's date
   - status as "draft" unless I say it's ready to publish
3. If I provided working code, place it as index.html (or the correct entry point
   for the format). Make sure all asset paths are relative.
4. If I did NOT provide code, write a complete, working index.html from scratch
   based on the description. It should match the design tokens:
   --bg: #0c0c0c  --fg: #e8e6e1  --accent: #4a9eff
   Use system-ui font. 8px spacing grid.
5. Generate a thumb.svg thumbnail that visually represents the project.
6. Write a short README.md describing what the project does and how to use it.
7. Run: node build/generate-manifest.js to validate.
8. Commit and push to main.

Additional notes:
[ANY EXTRA CONTEXT — e.g. "it should be fullscreen", "it uses React", "status is published"]
```

---

## Tips

- **Have code already?** Paste the whole file between the brackets. Claude will clean up paths and write the meta.
- **No code yet?** Just describe what you want built — Claude will write it from scratch.
- **Existing GitHub repo?** Paste the URL or paste the README and key files.
- **Mobile?** Type or dictate a description — that's enough for Claude to build something.

## Example filled-in prompt

```
I want to add a new project to my Vibe-rary at woodhouse711/web-dashboard.

Here is the project context:
A Pomodoro timer with a minimal dark UI. 25 minute work sessions,
5 minute breaks. Shows a circular progress ring, the current mode
(Focus / Break), and a start/stop button. Should play a soft chime
when the timer ends. No external dependencies.

Please do the following:
[... rest of prompt ...]

Additional notes:
Status is published. Aspect ratio 1:1.
```
