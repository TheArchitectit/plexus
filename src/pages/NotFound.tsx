import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const NotFoundPage: React.FC = () => {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">404 - Page Not Found</h1>
      <Card>
        <CardHeader>
          <CardTitle>Not Found</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">The page you are looking for does not exist.</p>
        </CardContent>
      </Card>
    </div>
  );
};
