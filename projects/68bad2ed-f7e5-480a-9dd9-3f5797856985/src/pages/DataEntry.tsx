# Data Entry Page Component

Here's a complete, production-ready DataEntry page component with TypeScript types and TailwindCSS styling:

import { useState } from 'react'

type FormData = {
  firstName: string
  lastName: string
  email: string
  age: number | null
  subscription: boolean
  plan: 'basic' | 'pro' | 'enterprise' | ''
}

export default function DataEntry() {
  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    email: '',
    age: null,
    subscription: false,
    plan: '',
  })

  const [errors, setErrors] = useState<Partial<FormData>>({})

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement
    const checked = type === 'checkbox' ? (e.target as HTMLInputElement).checked : undefined

    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : type === 'number' ? Number(value) : value,
    }))

    // Clear error when user starts typing
    if (errors[name as keyof FormData]) {
      setErrors(prev => ({ ...prev, [name]: undefined }))
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Partial<FormData> = {}
    
    if (!formData.firstName.trim()) newErrors.firstName = 'First name is required'
    if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required'
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/^\S+@\S+\.\S+$/.test(formData.email)) {
      newErrors.email = 'Email is invalid'
    }
    if (formData.age === null || formData.age < 18) {
      newErrors.age = 'You must be at least 18 years old'
    }
    if (!formData.plan) newErrors.plan = 'Please select a plan'

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (validateForm()) {
      // In a real app, you would submit to an API here
      console.log('Form submitted:', formData)
      alert('Form submitted successfully!')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto bg-white rounded-xl shadow-md overflow-hidden md:max-w-2xl">
        <div className="p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-800">Data Entry Form</h1>
            <p className="mt-2 text-gray-600">Please fill in your details</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
                  First Name *
                </label>
                <input
                  type="text"
                  id="firstName"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
                    errors.firstName ? 'border-red-500' : 'border'
                  }`}
                />
                {errors.firstName && (
                  <p className="mt-1 text-sm text-red-600">{errors.firstName}</p>
                )}
              </div>

              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
                  Last Name *
                </label>
                <input
                  type="text"
                  id="lastName"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
                    errors.lastName ? 'border-red-500' : 'border'
                  }`}
                />
                {errors.lastName && (
                  <p className="mt-1 text-sm text-red-600">{errors.lastName}</p>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email Address *
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
                  errors.email ? 'border-red-500' : 'border'
                }`}
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email}</p>
              )}
            </div>

            <div>
              <label htmlFor="age" className="block text-sm font-medium text-gray-700">
                Age *
              </label>
              <input
                type="number"
                id="age"
                name="age"
                min="18"
                value={formData.age || ''}
                onChange={handleChange}
                className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
                  errors.age ? 'border-red-500' : 'border'
                }`}
              />
              {errors.age && (
                <p className="mt-1 text-sm text-red-600">{errors.age}</p>
              )}
            </div>

            <div>
              <label htmlFor="plan" className="block text-sm font-medium text-gray-700">
                Select Plan *
              </label>
              <select
                id="plan"
                name="plan"
                value={formData.plan}
                onChange={handleChange}
                className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
                  errors.plan ? 'border-red-500' : 'border'
                }`}
              >
                <option value="">Select a plan</option>
                <option value="basic">Basic</option>
                <option value="pro">Pro</option>
                <option value="enterprise">Enterprise</option>
              </select>
              {errors.plan && (
                <p className="mt-1 text-sm text-red-600">{errors.plan}</p>
              )}
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="subscription"
                name="subscription"
                checked={formData.subscription}
                onChange={handleChange}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="subscription" className="ml-2 block text-sm text-gray-700">
                Subscribe to newsletter
              </label>
            </div>

            <div className="pt-4">
              <button
                type="submit"
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Submit
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
## Key Features

1. **Complete TypeScript Typing**:
   - Defined `FormData` interface for all form fields
   - Proper typing for form handlers and state

2. **Validation**:
   - Client-side validation with clear error messages
   - Real-time error clearing when user starts typing

3. **Responsive Design**:
   - Mobile-first approach with responsive grid layout
   - Clean, accessible form controls

4. **TailwindCSS Styling**:
   - Consistent spacing and typography
   - Focus states and hover effects
   - Error states with red borders and messages

5. **Component Structure**:
   - Proper form submission handling
   - Controlled components with React state
   - Semantic HTML elements

The component follows all requirements - no external UI libraries, only TailwindCSS for styling, and proper TypeScript typing throughout.