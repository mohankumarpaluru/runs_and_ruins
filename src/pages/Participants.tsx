import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { supabase } from '../lib/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import { UserPlus, User, ShieldCheck, ShieldOff } from 'lucide-react';

export function Participants() {
  const { participants, fetchParticipants } = useStore();
  const [newName, setNewName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddParticipant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('participants')
        .insert([{ name: newName.trim(), is_active: true }]);

      if (error) throw error;
      
      toast.success('Participant added successfully');
      setNewName('');
      await fetchParticipants();
    } catch (error: any) {
      toast.error(error.message || 'Failed to add participant');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('participants')
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) throw error;
      toast.success('Participant status updated');
      await fetchParticipants();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update status');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Participants</h1>
      </div>

      <Card className="glass-card">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-medium text-foreground flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-primary" />
            Add New Participant
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddParticipant} className="flex flex-col sm:flex-row gap-4">
            <Input
              placeholder="Participant Name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="flex-1 max-w-sm bg-surface/50 border-white/5 focus-visible:ring-primary"
            />
            <Button type="submit" disabled={isSubmitting || !newName.trim()} className="bg-primary hover:bg-primary/90 text-white w-full sm:w-auto">
              Add Participant
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="glass-card overflow-hidden">
        <CardContent className="p-0">
          {/* Desktop Table View */}
          <div className="hidden md:block">
            <Table>
              <TableHeader className="bg-surface/50">
                <TableRow className="border-white/5 hover:bg-transparent">
                  <TableHead className="text-muted-foreground font-medium">Name</TableHead>
                  <TableHead className="text-muted-foreground font-medium">Status</TableHead>
                  <TableHead className="text-right text-muted-foreground font-medium">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {participants.length === 0 ? (
                  <TableRow className="border-white/5">
                    <TableCell colSpan={3} className="text-center text-muted-foreground py-12">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <User className="w-8 h-8 opacity-20" />
                        <p>No participants found. Add one above.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  participants.map((p) => (
                    <TableRow key={p.id} className="border-white/5 hover:bg-white/[0.02] transition-colors">
                      <TableCell className="font-medium text-foreground">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                            {p.name.charAt(0).toUpperCase()}
                          </div>
                          {p.name}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={p.is_active ? 'bg-success/10 text-success border-success/20' : 'bg-surface text-muted-foreground border-white/10'}>
                          {p.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleStatus(p.id, p.is_active)}
                          className="border-white/10 hover:bg-white/5 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {p.is_active ? (
                            <><ShieldOff className="w-4 h-4 mr-2" /> Deactivate</>
                          ) : (
                            <><ShieldCheck className="w-4 h-4 mr-2" /> Activate</>
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden flex flex-col divide-y divide-white/5">
            {participants.length === 0 ? (
               <div className="text-center text-muted-foreground py-12">
                 <div className="flex flex-col items-center justify-center gap-2">
                   <User className="w-8 h-8 opacity-20" />
                   <p>No participants found. Add one above.</p>
                 </div>
               </div>
            ) : (
              participants.map((p) => (
                <div key={p.id} className="p-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                      {p.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-medium text-foreground">{p.name}</div>
                      <Badge variant="outline" className={`mt-1 ${p.is_active ? 'bg-success/10 text-success border-success/20' : 'bg-surface text-muted-foreground border-white/10'}`}>
                        {p.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => toggleStatus(p.id, p.is_active)}
                    className="border-white/10 hover:bg-white/5 text-muted-foreground hover:text-foreground transition-colors rounded-full w-10 h-10"
                    title={p.is_active ? 'Deactivate' : 'Activate'}
                  >
                    {p.is_active ? <ShieldOff className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
                  </Button>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
