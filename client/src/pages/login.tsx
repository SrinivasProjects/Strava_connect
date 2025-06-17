import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { loginWithGoogle, handleRedirect, auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
// import { apiRequest } from "@/lib/queryClient";
import { Activity } from "lucide-react";

export default function Login() {
  const [, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Handle redirect result on page load
    handleRedirect()
      .then(async (result) => {
        if (result?.user) {
          await handleUserLogin(result.user);
        }
      })
      .catch((error) => {
        console.error('Redirect result error:', error);
        setIsLoading(false);
      });

    // Listen for auth state changes
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        await handleUserLogin(user);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleUserLogin = async (user: any) => {
    try {
      setIsLoading(true);
      
      // Get ID token
      const idToken = await user.getIdToken();
      
      // Send user data to backend
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          firebaseUid: user.uid,
          email: user.email,
          name: user.displayName || user.email,
          profilePicture: user.photoURL,
        }),
      });

      if (!response.ok) {
        throw new Error('Login failed');
      }

      // Store token for API requests
      localStorage.setItem('firebaseToken', idToken);
      localStorage.setItem('firebaseUid', user.uid);
      
      setLocation('/dashboard');
    } catch (error) {
      console.error('Login error:', error);
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setIsLoading(true);
      await loginWithGoogle();
    } catch (error) {
      console.error('Google login error:', error);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-secondary to-primary">
      <Card className="w-full max-w-md mx-4 shadow-2xl">
        <CardContent className="p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-primary rounded-xl flex items-center justify-center mx-auto mb-4">
              <Activity className="text-white text-2xl" size={32} />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">ActivitySync</h1>
            <p className="text-gray-600">Connect your fitness journey</p>
          </div>
          
          <div className="space-y-4">
            <Button
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-3 bg-white border-2 border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-gray-900"
              variant="outline"
            >
              <img 
                src="https://developers.google.com/identity/images/g-logo.png" 
                alt="Google" 
                className="w-5 h-5"
              />
              <span className="font-medium">
                {isLoading ? 'Signing in...' : 'Continue with Google'}
              </span>
            </Button>
          </div>
          
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500">
              By continuing, you agree to our{' '}
              <a href="#" className="text-primary hover:underline">Terms of Service</a>{' '}
              and{' '}
              <a href="#" className="text-primary hover:underline">Privacy Policy</a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
