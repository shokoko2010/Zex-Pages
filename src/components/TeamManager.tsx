
import React, { useState } from 'react';
import { PageProfile, TeamMember, Role } from '../types';
import Button from './ui/Button';
import TrashIcon from './icons/TrashIcon';
import { db } from '../services/firebaseService';

interface TeamManagerProps {
  profile: PageProfile;
  onProfileChange: (newProfile: PageProfile) => void;
}

const TeamManager: React.FC<TeamManagerProps> = ({ profile, onProfileChange }) => {
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<Role>('editor');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    if (!inviteEmail) {
      setError('يرجى إدخال البريد الإلكتروني.');
      setIsLoading(false);
      return;
    }

    if (profile.team?.some(member => member.email === inviteEmail)) {
        setError('هذا المستخدم عضو بالفعل في الفريق.');
        setIsLoading(false);
        return;
    }

    try {
      const usersRef = db.collection('users');
      const userQuery = await usersRef.where('email', '==', inviteEmail).limit(1).get();

      if (userQuery.empty) {
        setError('لم يتم العثور على مستخدم بهذا البريد الإلكتروني.');
        setIsLoading(false);
        return;
      }

      const invitedUserDoc = userQuery.docs[0];
      const invitedUser = invitedUserDoc.data();

      if (invitedUser.uid === profile.ownerUid) {
          setError("لا يمكنك دعوة نفسك.");
          setIsLoading(false);
          return;
      }

      const newMember: TeamMember = {
        uid: invitedUser.uid,
        email: invitedUser.email,
        role: inviteRole,
      };

      const updatedTeam = [...(profile.team || []), newMember];
      const updatedMembers = [...(profile.members || []), invitedUser.uid];

      onProfileChange({
        ...profile,
        team: updatedTeam,
        members: updatedMembers,
      });

      setInviteEmail('');
      setInviteRole('editor');
    } catch (e) {
      console.error("Error inviting user:", e);
      setError('حدث خطأ أثناء إرسال الدعوة.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveMember = (uidToRemove: string) => {
    const updatedTeam = (profile.team || []).filter(member => member.uid !== uidToRemove);
    const updatedMembers = (profile.members || []).filter(uid => uid !== uidToRemove);

    onProfileChange({
      ...profile,
      team: updatedTeam,
      members: updatedMembers,
    });
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleInvite} className="p-4 border rounded-lg dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 space-y-3">
        <h4 className="font-semibold text-lg">دعوة عضو جديد</h4>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="البريد الإلكتروني للعضو"
            className="flex-grow p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
          />
          <select
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value as Role)}
            className="p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
          >
            <option value="editor">محرر</option>
            <option value="viewer">مشاهد</option>
          </select>
          <Button type="submit" isLoading={isLoading}>
            إرسال دعوة
          </Button>
        </div>
        {error && <p className="text-red-500 text-sm">{error}</p>}
      </form>

      <div>
        <h4 className="font-semibold text-lg mb-2">أعضاء الفريق الحاليين</h4>
        <div className="space-y-3">
          {profile.team && profile.team.length > 0 ? (
            profile.team.map(member => (
              <div key={member.uid} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div>
                  <p className="font-bold text-gray-900 dark:text-white">{member.email}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">{member.role === 'editor' ? 'محرر' : 'مشاهد'}</p>
                </div>
                <Button variant="danger" className="!p-2" onClick={() => handleRemoveMember(member.uid)}>
                  <TrashIcon className="w-5 h-5" />
                </Button>
              </div>
            ))
          ) : (
            <p className="text-gray-500 dark:text-gray-400 text-center py-4">أنت العضو الوحيد في هذا الفريق.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default TeamManager;
