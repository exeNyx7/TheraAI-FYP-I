# TheraAI UI Component Library

A comprehensive collection of reusable UI components built with React, Tailwind CSS, and Lucide icons.

## 🎯 Overview

All components are designed to be:
- **Reusable**: Can be used across different parts of the application
- **Accessible**: Built with accessibility in mind
- **Customizable**: Extensive props for customization
- **Consistent**: Follow the same design patterns and naming conventions
- **Type-safe**: Full TypeScript support (when applicable)

## 📦 Installation & Usage

Import components from the UI library:

```jsx
import { Button, Card, Loading, Alert } from '../../components/ui';
```

Or import individual components:

```jsx
import { Button } from '../../components/ui/button';
import { Loading } from '../../components/Loading/Loading';
```

## 🧩 Components

### Alert
Displays important messages to users with different variants and dismiss functionality.

```jsx
<Alert variant="success" dismissible onDismiss={() => console.log('dismissed')}>
  <AlertTitle>Success!</AlertTitle>
  <AlertDescription>Your data has been saved successfully.</AlertDescription>
</Alert>
```

**Props:**
- `variant`: 'default' | 'destructive' | 'success' | 'warning' | 'info'
- `dismissible`: boolean - Whether alert can be dismissed
- `onDismiss`: function - Callback when alert is dismissed

---

### Avatar & UserAvatar
Display user profile images with fallback support.

```jsx
<UserAvatar 
  src="/path/to/image.jpg"
  fallback="JD"
  alt="John Doe"
  size="lg"
/>
```

**Props:**
- `src`: string - Image URL
- `fallback`: string - Fallback text (usually initials)
- `alt`: string - Alt text for accessibility
- `size`: 'sm' | 'md' | 'lg' | 'xl'

---

### Badge
Small status indicators and labels.

```jsx
<Badge variant="success">Active</Badge>
<Badge variant="warning">Pending</Badge>
<Badge variant="destructive">Error</Badge>
```

**Props:**
- `variant`: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'info'

---

### Button
Enhanced button component with multiple variants and states.

```jsx
<Button 
  variant="gradient" 
  size="lg" 
  loading={isLoading}
  leftIcon={<Save />}
  onClick={handleSave}
>
  Save Changes
</Button>
```

**Props:**
- `variant`: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link' | 'gradient' | 'success' | 'warning' | 'purple'
- `size`: 'sm' | 'default' | 'lg' | 'icon' | 'icon-sm' | 'icon-lg'
- `loading`: boolean - Shows loading spinner
- `leftIcon`: ReactNode - Icon on the left
- `rightIcon`: ReactNode - Icon on the right

---

### Card
Container component with header, content, and footer sections.

```jsx
<Card>
  <CardHeader>
    <CardTitle>Card Title</CardTitle>
    <CardDescription>Card description text</CardDescription>
  </CardHeader>
  <CardContent>
    <p>Card content goes here</p>
  </CardContent>
  <CardFooter>
    <Button>Action</Button>
  </CardFooter>
</Card>
```

---

### Input
Enhanced input component with variants, icons, and validation states.

```jsx
<Input 
  type="email"
  placeholder="Enter your email"
  leftIcon={<Mail />}
  variant="default"
  size="default"
/>

<Input 
  type="password"
  error={hasError}
  rightIcon={<EyeOff />}
/>
```

**Props:**
- `variant`: 'default' | 'error' | 'success'
- `size`: 'sm' | 'default' | 'lg'
- `leftIcon`: ReactNode - Icon on the left
- `rightIcon`: ReactNode - Icon on the right
- `error`: boolean - Shows error state
- `success`: boolean - Shows success state

---

### Loading
Flexible loading component with multiple variants and sizes.

```jsx
<Loading 
  size="lg"
  message="Loading your data..."
  variant="spinner"
  color="blue"
  fullScreen={false}
/>

<Loading variant="dots" size="sm" showMessage={false} />
<Loading variant="pulse" color="purple" />
```

**Props:**
- `size`: 'sm' | 'md' | 'lg' | 'xl'
- `message`: string - Loading message
- `fullScreen`: boolean - Show as overlay
- `variant`: 'spinner' | 'dots' | 'pulse'
- `color`: 'blue' | 'purple' | 'green' | 'gray'
- `showMessage`: boolean - Whether to show the message

---

### Progress
Visual progress indicators with customization options.

```jsx
<Progress 
  value={75} 
  color="green" 
  size="md"
  showPercentage={true}
  animated={true}
/>
```

**Props:**
- `value`: number (0-100) - Progress value
- `color`: 'blue' | 'green' | 'purple' | 'red' | 'yellow'
- `size`: 'sm' | 'md' | 'lg'
- `showPercentage`: boolean - Show percentage text
- `animated`: boolean - Add animation effect

---

### Separator
Visual dividers for content sections.

```jsx
<Separator />
<Separator orientation="vertical" className="h-20" />
```

**Props:**
- `orientation`: 'horizontal' | 'vertical'
- `decorative`: boolean - Whether separator is decorative

---

### Skeleton
Loading placeholders for content.

```jsx
<Skeleton className="w-full h-4" />
<SkeletonText lines={3} />
<SkeletonCard />
<SkeletonAvatar size="lg" />
```

**Variants:**
- `Skeleton`: Basic skeleton
- `SkeletonText`: Multi-line text placeholder
- `SkeletonCard`: Card-like placeholder
- `SkeletonAvatar`: Avatar placeholder

---

### Tooltip
Contextual information on hover or focus.

```jsx
<Tooltip content="This button saves your progress" position="top">
  <Button>Save</Button>
</Tooltip>
```

**Props:**
- `content`: string - Tooltip text
- `position`: 'top' | 'bottom' | 'left' | 'right'
- `disabled`: boolean - Disable tooltip

## 🎨 Styling & Customization

### Theme Colors
All components use consistent color schemes:
- **Primary**: Blue (#3B82F6)
- **Success**: Green (#10B981) 
- **Warning**: Yellow (#F59E0B)
- **Error/Destructive**: Red (#EF4444)
- **Info**: Blue (#3B82F6)
- **Purple**: Purple (#8B5CF6)

### Custom Classes
All components accept a `className` prop for additional styling:

```jsx
<Button className="shadow-xl hover:shadow-2xl">
  Custom Styled Button
</Button>
```

### Size Consistency
Components follow consistent sizing:
- `sm`: Small size
- `md`/`default`: Default/medium size  
- `lg`: Large size
- `xl`: Extra large size (where applicable)

## 🚀 Best Practices

### Component Composition
```jsx
// Good: Compose components together
<Card>
  <CardHeader>
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <UserAvatar src={user.avatar} fallback={user.initials} />
        <div>
          <CardTitle>{user.name}</CardTitle>
          <Badge variant="success">Online</Badge>
        </div>
      </div>
      <Tooltip content="More options">
        <Button variant="ghost" size="icon">
          <MoreHorizontal />
        </Button>
      </Tooltip>
    </div>
  </CardHeader>
  <CardContent>
    <Progress value={user.progress} showPercentage />
  </CardContent>
</Card>
```

### Loading States
```jsx
// Show loading states appropriately
{loading ? (
  <Loading size="md" message="Saving changes..." />
) : (
  <Button onClick={handleSave}>Save</Button>
)}
```

### Error Handling
```jsx
// Provide user feedback
{error && (
  <Alert variant="destructive" dismissible onDismiss={clearError}>
    <AlertTitle>Error</AlertTitle>
    <AlertDescription>{error.message}</AlertDescription>
  </Alert>
)}
```

## 🔧 Development

### Adding New Components
1. Create the component in `/components/ui/`
2. Follow the existing patterns for props and variants
3. Export it from `/components/ui/index.js`
4. Document it in this README

### Testing Components
```jsx
// Example usage in your pages/components
import { Button, Loading, Alert } from '../components/ui';

function MyComponent() {
  return (
    <div className="space-y-4">
      <Button variant="gradient">Click me</Button>
      <Loading variant="dots" />
      <Alert variant="info">
        <AlertTitle>Information</AlertTitle>
        <AlertDescription>This is how you use our components!</AlertDescription>
      </Alert>
    </div>
  );
}
```

## 📱 Responsive Design

All components are mobile-first and responsive:
- Use Tailwind's responsive prefixes (`sm:`, `md:`, `lg:`, `xl:`)
- Components adapt to screen sizes automatically
- Touch-friendly on mobile devices

## ♿ Accessibility

Components include accessibility features:
- Proper ARIA labels and roles
- Keyboard navigation support
- Screen reader compatibility
- Focus management
- Color contrast compliance

## 🔄 Updates & Maintenance

This component library is actively maintained. When updating:
1. Maintain backward compatibility when possible
2. Update this documentation
3. Test across different use cases
4. Consider accessibility impact

---

**Happy coding with TheraAI UI Components! 🎉**