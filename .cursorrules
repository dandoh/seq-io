# shadcn instructions

Use the latest version of Shadcn to install new components, like this command to add a button component:

```bash
pnpx shadcn@latest add button
```

## Theme Colors

ALWAYS use shadcn theme colors via CSS variables instead of hardcoded colors like "red", "blue", "#ffffff", etc.

**Correct approach:**

- Use Tailwind utility classes with theme colors: `bg-primary`, `text-primary`, `border-border`
- For custom colors, use CSS variables: `oklch(var(--primary))`, `oklch(var(--destructive))`, etc.

**Available theme colors from src/styles.css:**

### Core Semantic Colors

- `background` / `foreground` - Page background and text
- `card` / `card-foreground` - Card backgrounds
- `popover` / `popover-foreground` - Popover backgrounds
- `primary` / `primary-foreground` - Primary actions (buttons, links)
- `secondary` / `secondary-foreground` - Secondary actions
- `muted` / `muted-foreground` - Muted/subtle elements
- `accent` / `accent-foreground` - Accent elements
- `destructive` / `destructive-foreground` - Destructive actions (delete, error)
- `border` - Border colors
- `input` - Input borders
- `ring` - Focus ring colors

### Color Scales (50-1000, lightest to darkest)

- `base-{50,100,200,300,400,500,600,700,800,900,950,1000}` - Neutral grays
- `primary-{50,100,200,300,400,500,600,700,800,900,950,1000}` - Primary color scale
- `secondary-{50,100,200,300,400,500,600,700,800,900,950,1000}` - Secondary color scale

### Specialized Colors

- `chart-{1,2,3,4,5}` - Chart/data visualization colors
- `sidebar` / `sidebar-foreground` - Sidebar backgrounds
- `sidebar-primary` / `sidebar-primary-foreground` - Sidebar primary elements
- `sidebar-accent` / `sidebar-accent-foreground` - Sidebar accents
- `sidebar-border` / `sidebar-ring` - Sidebar borders and focus

**Examples:**

```tsx
// ✅ CORRECT - Use Tailwind classes
<div className="bg-primary text-primary-foreground">
<p className="text-muted-foreground">Subtitle text</p>
<div className="bg-base-100 border-base-300">Light background</div>
<div className="text-primary-600">Custom primary shade</div>

// ❌ WRONG - Do not use hardcoded colors
<div className="bg-red-500 text-white">
<button className="bg-[#ff0000]">Delete</button>
<p style={{ color: "blue" }}>Subtitle text</p>
<div className="text-gray-600">Gray text</div>
```

This ensures consistent theming and makes dark mode work automatically.

### Database

Never run generate migrations or apply migrations, I'll run it manually myself

### Documentation

NEVER create documentation files (*.md files) unless explicitly asked by the user. This includes README files, setup guides, API documentation, or any other markdown files.
