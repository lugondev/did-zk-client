# DID Example Client

A modern Next.js frontend for the DID Example project, providing a user-friendly interface for DID operations and zero-knowledge proof interactions.

## Features

- 🎨 Modern, responsive UI built with Next.js 15
- 🔒 Secure DID management interface
- 🔑 Client-side cryptographic operations
- 📱 Dashboard for DID and credential management
- 🌐 Real-time DID operations with backend integration
- 🎭 Zero-knowledge proof generation and verification
- 🔐 Secure authentication flow

## Tech Stack

- Next.js 15.3.0
- React 19
- TypeScript
- TailwindCSS for styling
- shadcn/ui components
- Noble Curves for cryptographic operations
- TweetNaCl for additional crypto functionality
- Sonner for toast notifications

## Getting Started

### Prerequisites

- Node.js 20 or later
- pnpm (recommended) or npm
- Backend server running (see [backend README](../backend/README.md))

### Installation

```bash
# Install dependencies
pnpm install
```

### Development

```bash
# Start development server
pnpm dev
```

The app will be available at http://localhost:3000

### Production

```bash
# Build for production
pnpm build

# Start production server
pnpm start
```

### Linting and Type Checking

```bash
# Run ESLint
pnpm lint

# Type check
pnpm type-check
```

## Project Structure

```
client/
├── src/
│   ├── app/                    # Next.js app directory
│   │   ├── api/               # API route handlers
│   │   ├── dashboard/         # Dashboard pages
│   │   ├── login/            # Authentication pages
│   │   └── register/         # User registration
│   ├── components/            # React components
│   │   ├── ui/               # UI components
│   │   └── DIDForm.tsx       # DID creation form
│   ├── lib/                   # Utility functions
│   │   ├── auth.ts           # Authentication logic
│   │   ├── config.ts         # Configuration
│   │   └── utils.ts          # Helper functions
│   └── types/                 # TypeScript definitions
├── public/                    # Static assets
└── tailwind.config.ts        # Tailwind configuration
```

## Features in Detail

### Dashboard
- DID Management
- Activity Monitoring
- Profile Settings
- Age Credential Management

### Authentication
- Secure login with DID
- Zero-knowledge proof generation
- Challenge-response mechanism
- Session management

### DID Operations
- Create new DIDs
- Manage existing DIDs
- Generate age credentials
- Verify credentials using ZKPs

## API Integration

The client communicates with the backend through RESTful endpoints:

- `POST /api/did/create`: Create new DIDs
- `POST /api/did/authenticate`: Authenticate using DIDs
- `POST /api/did/verify`: Verify DID proofs

## Security Considerations

- Client-side cryptographic operations
- Secure storage of DID information
- Protection against XSS and CSRF
- Input validation and sanitization
- Secure authentication flow

## UI Components

Built using shadcn/ui components:
- Alert
- Avatar
- Badge
- Button
- Card
- Form
- Input
- Label
- Separator
- Switch
- Tabs

## Development Guidelines

1. **TypeScript**
   - Maintain strict type checking
   - Use interfaces for prop types
   - Avoid `any` types

2. **Components**
   - Follow atomic design principles
   - Keep components focused and reusable
   - Implement proper error boundaries

3. **State Management**
   - Use React hooks effectively
   - Implement proper loading states
   - Handle errors gracefully

4. **Testing**
   - Write unit tests for components
   - Test error scenarios
   - Verify cryptographic operations

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Contributing

When contributing to the frontend:

1. Follow the established code style
2. Add proper TypeScript types
3. Update documentation as needed
4. Test across supported browsers
