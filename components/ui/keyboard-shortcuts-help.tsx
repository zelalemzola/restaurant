'use client';

import { useState } from 'react';
import { Keyboard, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { KeyboardShortcut, useKeyboardShortcutsHelp } from '@/hooks/use-keyboard-shortcuts';

interface KeyboardShortcutsHelpProps {
  shortcuts: KeyboardShortcut[];
  trigger?: React.ReactNode;
}

export function KeyboardShortcutsHelp({ shortcuts, trigger }: KeyboardShortcutsHelpProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { formatShortcut, groupShortcutsByCategory } = useKeyboardShortcutsHelp();

  const groupedShortcuts = groupShortcutsByCategory(shortcuts);

  const defaultTrigger = (
    <Button variant="outline" size="sm">
      <Keyboard className="h-4 w-4 mr-2" />
      Shortcuts
    </Button>
  );

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            Keyboard Shortcuts
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {Object.entries(groupedShortcuts).map(([category, categoryShortcuts]) => (
            <Card key={category}>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">{category}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {categoryShortcuts.map((shortcut, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm">{shortcut.description}</span>
                      <Badge variant="outline" className="font-mono text-xs">
                        {formatShortcut(shortcut)}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
          
          <div className="text-xs text-muted-foreground text-center">
            <p>Shortcuts are disabled when typing in input fields.</p>
            <p>Press <Badge variant="outline" className="font-mono text-xs">Shift + ?</Badge> to show this help anytime.</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}