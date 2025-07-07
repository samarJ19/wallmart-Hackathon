import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Users,
  Plus,
  Send,
  CheckCircle,
  AlertCircle,
  Search,
  UserPlus,
} from "lucide-react";
import { useAuthenticatedAPI } from "@/services/api";

interface Group {
  id: string;
  name: string;
  description: string;
}

interface CreateGroupData {
  name: string;
  description: string;
}

interface InviteUserData {
  groupId: string;
  userEmail: string;
}

const GroupManagementPage = () => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(false);
  const [createGroupOpen, setCreateGroupOpen] = useState(false);
  const [inviteUserOpen, setInviteUserOpen] = useState(false);
  const [alert, setAlert] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const authAPI = useAuthenticatedAPI();
  // Create Group Form State
  const [createGroupData, setCreateGroupData] = useState<CreateGroupData>({
    name: "",
    description: "",
  });

  // Invite User Form State
  const [inviteUserData, setInviteUserData] = useState<InviteUserData>({
    groupId: "",
    userEmail: "",
  });

  // Fetch user's groups where they are admin
  const fetchAdminGroups = async () => {
    try {
      setLoading(true);
      // Replace with your actual API call
      const response = await authAPI.get("/api/groups/admin/my-groups");
      console.log("Group data received: ", response.data.groups);
      let tempGroup = response.data.groups?.length>0 ? response.data.groups : []
      setGroups(tempGroup);
    } catch (error) {
      console.error("Error fetching groups:", error);
      showAlert("error", "Failed to fetch groups");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminGroups();
  }, []);

  const showAlert = (type: "success" | "error", message: string) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 5000);
  };

  const handleCreateGroup = async () => {
    if (!createGroupData.name.trim()) {
      showAlert("error", "Group name is required");
      return;
    }

    try {
      setLoading(true);

      // Replace with your actual API call
      const response = await authAPI.post("/api/groups/create", {
        name: createGroupData.name,
        description: createGroupData.description,
      });

      if (response.status == 201) {
        const newGroup = response.data.groupChat;
        setGroups((prev) => [...prev, newGroup]);
        setCreateGroupData({ name: "", description: "" });
        setCreateGroupOpen(false);
        showAlert("success", "Group created successfully!");
      } else {
        const error = response.data;
        showAlert("error", error.error || "Failed to create group");
      }
    } catch (error) {
      console.error("Error creating group:", error);
      showAlert("error", "Failed to create group");
    } finally {
      setLoading(false);
    }
  };

  const handleInviteUser = async () => {
    if (!inviteUserData.groupId || !inviteUserData.userEmail.trim()) {
      showAlert("error", "Please select a group and enter user email");
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(inviteUserData.userEmail)) {
      showAlert("error", "Please enter a valid email address");
      return;
    }

    try {
      setLoading(true);

      // Replace with your actual API call
      const response = await authAPI.post("/api/groups/invite", {
        groupChatId: inviteUserData.groupId,
        userEmail: inviteUserData.userEmail,
      });

      if (response.status == 200) {
        setInviteUserData({ groupId: "", userEmail: "" });
        setInviteUserOpen(false);
        showAlert("success", "User invited successfully!");
      } else {
        const error = response.data;
        showAlert("error", error.error || "Failed to invite user");
      }
    } catch (error) {
      console.error("Error inviting user:", error);
      showAlert("error", "Failed to invite user");
    } finally {
      setLoading(false);
    }
  };

  const adminGroups = groups;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Group Management
          </h1>
          <p className="text-gray-600">
            Create new groups and invite users to join your communities
          </p>
        </div>

        {/* Alert */}
        {alert && (
          <Alert
            className={`mb-6 ${
              alert.type === "success" ? "border-green-500" : "border-red-500"
            }`}
          >
            {alert.type === "success" ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <AlertCircle className="h-4 w-4 text-red-600" />
            )}
            <AlertDescription
              className={
                alert.type === "success" ? "text-green-700" : "text-red-700"
              }
            >
              {alert.message}
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Create Group Card */}
          <Card className="h-fit">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Create New Group
              </CardTitle>
              <CardDescription>
                Start a new community by creating a group
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Dialog open={createGroupOpen} onOpenChange={setCreateGroupOpen}>
                <DialogTrigger asChild>
                  <Button className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Group
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Create New Group</DialogTitle>
                    <DialogDescription>
                      Fill in the details to create a new group
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="groupName">Group Name *</Label>
                      <Input
                        id="groupName"
                        value={createGroupData.name}
                        onChange={(e) =>
                          setCreateGroupData((prev) => ({
                            ...prev,
                            name: e.target.value,
                          }))
                        }
                        placeholder="Enter group name"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="groupDescription">Description</Label>
                      <Textarea
                        id="groupDescription"
                        value={createGroupData.description}
                        onChange={(e) =>
                          setCreateGroupData((prev) => ({
                            ...prev,
                            description: e.target.value,
                          }))
                        }
                        placeholder="Enter group description (optional)"
                        rows={3}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={handleCreateGroup}
                        disabled={loading}
                        className="flex-1"
                      >
                        {loading ? "Creating..." : "Create Group"}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setCreateGroupOpen(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>

          {/* Invite Users Card */}
          <Card className="h-fit">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                Invite Users
              </CardTitle>
              <CardDescription>
                Invite users to join your existing groups
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Dialog open={inviteUserOpen} onOpenChange={setInviteUserOpen} >
                <DialogTrigger asChild>
                  <Button
                    className="w-full"
                    disabled={adminGroups.length === 0}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Send Invitation
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md ">
                  <DialogHeader>
                    <DialogTitle>Invite User to Group</DialogTitle>
                    <DialogDescription>
                      Select a group and enter the user's email address
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-8">
                    <div>
                      <Label className="mb-2" htmlFor="selectGroup">Select Group *</Label>
                      <Select
                        value={inviteUserData.groupId}
                        onValueChange={(value) =>
                          setInviteUserData((prev) => ({
                            ...prev,
                            groupId: value,
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Choose a group" />
                        </SelectTrigger>
                        <SelectContent>
                          {adminGroups.map((group) => (
                            <SelectItem key={group.id} value={group.id}>
                              {group.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="mb-2" htmlFor="userEmail">User Email *</Label>
                      <div className="relative">
                        <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          id="userEmail"
                          type="email"
                          value={inviteUserData.userEmail}
                          onChange={(e) =>
                            setInviteUserData((prev) => ({
                              ...prev,
                              userEmail: e.target.value,
                            }))
                          }
                          placeholder="Enter user's email address"
                          className="pl-10"
                          required
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={handleInviteUser}
                        disabled={loading}
                        className="flex-1"
                      >
                        {loading ? "Sending..." : "Send Invitation"}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setInviteUserOpen(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
              {adminGroups.length === 0 && (
                <p className="text-sm text-gray-500 mt-2">
                  You need to be an admin of at least one group to invite users.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Groups Overview */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Your Admin Groups ({adminGroups.length})
            </CardTitle>
            <CardDescription>
              Groups where you have admin privileges
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">Loading groups...</p>
              </div>
            ) : adminGroups.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">
                  No admin groups found. Create your first group!
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {adminGroups.map((group) => (
                  <div
                    key={group.id}
                    className="border rounded-lg p-4 hover:bg-gray-50"
                  >
                    <h3 className="font-semibold text-gray-900">
                      {group.name}
                    </h3>
                    {group.description && (
                      <p className="text-gray-600 mt-1">{group.description}</p>
                    )}
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-sm text-blue-600 font-medium">
                        Admin
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setInviteUserData((prev) => ({
                            ...prev,
                            groupId: group.id,
                          }));
                          setInviteUserOpen(true);
                        }}
                      >
                        <UserPlus className="h-4 w-4 mr-1" />
                        Invite
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default GroupManagementPage;
