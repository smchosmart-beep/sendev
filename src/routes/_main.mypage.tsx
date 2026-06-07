import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import {
  UserRound,
  FileText,
  MessageSquare,
  Heart,
  LogOut,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  getMyDashboard,
  type DashboardDTO,
  type DashCommentDTO,
  type DashLikeDTO,
} from "@/lib/platform.functions";
import { useStoredIdentity } from "@/hooks/useNicknameIdentity";

export const Route = createFileRoute("/_main/mypage")({
  head: () => ({
    meta: [
      { title: "내 페이지 — SEN.DEV" },
      {
        name: "description",
        content: "닉네임으로 로그인해 내가 쓴 글, 댓글 반응, 좋아요를 확인하세요.",
      },
    ],
  }),
  component: MyPage,
});

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("ko-KR");
}

function MyPage() {
  const { identity, save, clear } = useStoredIdentity();
  const [username, setUsername] = useState(identity?.author ?? "");
  const [password, setPassword] = useState(identity?.nicknamePassword ?? "");
  const [remember, setRemember] = useState(true);
  const [data, setData] = useState<DashboardDTO | null>(null);
  const fetchDashboard = useServerFn(getMyDashboard);

  const mutation = useMutation({
    mutationFn: (input: { username: string; password: string }) =>
      fetchDashboard({ data: input }),
    onSuccess: (res, vars) => {
      setData(res);
      if (remember) {
        save(vars.username, vars.password);
      }
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "로그인에 실패했어요."),
  });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const u = username.trim();
    if (!u || !password) {
      toast.error("닉네임과 비밀번호를 입력해주세요.");
      return;
    }
    mutation.mutate({ username: u, password });
  };

  if (data) {
    return (
      <Dashboard
        data={data}
        stored={!!identity?.author}
        onClearStored={() => {
          clear();
          toast.success("이 기기에 저장된 닉네임을 지웠어요.");
        }}
        onLogout={() => {
          setData(null);
          setPassword("");
        }}
      />
    );
  }

  return (
    <div className="mx-auto max-w-md py-8">
      <div className="mb-6 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <UserRound className="h-6 w-6" />
        </div>
        <h1 className="text-xl font-bold text-foreground">내 페이지</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          글·댓글을 작성할 때 등록한 닉네임과 비밀번호로 확인할 수 있어요.
        </p>
      </div>

      <Card className="p-6">
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="mp-username">닉네임</Label>
            <Input
              id="mp-username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="닉네임"
              autoComplete="username"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="mp-password">닉네임 비밀번호</Label>
            <Input
              id="mp-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호"
              autoComplete="current-password"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="h-4 w-4 rounded border-border accent-primary"
            />
            이 기기에 저장 (글·댓글 작성 시 자동 입력)
          </label>
          <Button type="submit" className="w-full" disabled={mutation.isPending}>
            {mutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            로그인
          </Button>
          <p className="text-xs text-muted-foreground">
            닉네임을 처음 쓰면 비밀번호가 등록되고, 다음부터 같은 비밀번호로 인증합니다.
          </p>
        </form>
      </Card>
    </div>
  );
}


function Dashboard({
  data,
  stored,
  onClearStored,
  onLogout,
}: {
  data: DashboardDTO;
  stored: boolean;
  onClearStored: () => void;
  onLogout: () => void;
}) {
  return (
    <div className="space-y-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">내 페이지</p>
          <h1 className="text-2xl font-bold text-foreground">{data.username}</h1>
        </div>
        <div className="flex items-center gap-2">
          {stored && (
            <Button variant="ghost" size="sm" onClick={onClearStored}>
              기기 저장 해제
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={onLogout}>
            <LogOut className="mr-1.5 h-4 w-4" />
            로그아웃
          </Button>
        </div>
      </div>

      <LevelCard level={data.level} points={data.points} award={data.award} />


      <div className="grid grid-cols-3 gap-3">
        <StatCard icon={FileText} label="작성한 글" value={data.myPosts.length} />
        <StatCard
          icon={MessageSquare}
          label="작성한 댓글"
          value={data.myComments.length}
        />
        <StatCard
          icon={Heart}
          label="받은 좋아요"
          value={data.likesReceived.total}
        />
      </div>

      <Tabs defaultValue="posts">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="posts">내가 쓴 글</TabsTrigger>
          <TabsTrigger value="comments">댓글 반응</TabsTrigger>
          <TabsTrigger value="likes">좋아요</TabsTrigger>
        </TabsList>

        <TabsContent value="posts" className="mt-4 space-y-2">
          {data.myPosts.length === 0 ? (
            <EmptyRow text="아직 작성한 글이 없어요." />
          ) : (
            data.myPosts.map((p) => (
              <PostLink
                key={p.id}
                slug={p.categorySlug}
                postNo={p.postNo}
                title={p.title}
                meta={`${p.categoryName} · ${formatDate(p.createdAt)} · 댓글 ${p.commentCount}`}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="comments" className="mt-4">
          <Tabs defaultValue="mine">
            <TabsList className="grid w-full max-w-xs grid-cols-2">
              <TabsTrigger value="mine">내가 쓴 댓글</TabsTrigger>
              <TabsTrigger value="received">내 글에 달린 댓글</TabsTrigger>
            </TabsList>
            <TabsContent value="mine" className="mt-3 space-y-2">
              {data.myComments.length === 0 ? (
                <EmptyRow text="아직 작성한 댓글이 없어요." />
              ) : (
                data.myComments.map((c) => (
                  <CommentRow key={c.id} comment={c} />
                ))
              )}
            </TabsContent>
            <TabsContent value="received" className="mt-3 space-y-2">
              {data.repliesToMe.length === 0 ? (
                <EmptyRow text="내 글에 달린 댓글이 아직 없어요." />
              ) : (
                data.repliesToMe.map((c) => (
                  <CommentRow key={c.id} comment={c} showAuthor />
                ))
              )}
            </TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="likes" className="mt-4">
          <Tabs defaultValue="received">
            <TabsList className="grid w-full max-w-xs grid-cols-2">
              <TabsTrigger value="received">받은 좋아요</TabsTrigger>
              <TabsTrigger value="given">누른 좋아요</TabsTrigger>
            </TabsList>
            <TabsContent value="received" className="mt-3 space-y-2">
              {data.likesReceived.items.length === 0 ? (
                <EmptyRow text="아직 받은 좋아요가 없어요." />
              ) : (
                data.likesReceived.items.map((l) => (
                  <LikeRow key={l.id} like={l} mode="received" />
                ))
              )}
            </TabsContent>
            <TabsContent value="given" className="mt-3 space-y-2">
              {data.likesGiven.length === 0 ? (
                <EmptyRow text="아직 누른 좋아요가 없어요." />
              ) : (
                data.likesGiven.map((l) => (
                  <LikeRow key={l.id} like={l} mode="given" />
                ))
              )}
            </TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof FileText;
  label: string;
  value: number;
}) {
  return (
    <Card className="flex flex-col items-center gap-1 p-4 text-center">
      <Icon className="h-5 w-5 text-primary" />
      <span className="text-2xl font-bold text-foreground tabular-nums">
        {value}
      </span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </Card>
  );
}

function EmptyRow({ text }: { text: string }) {
  return (
    <Card className="p-6 text-center text-sm text-muted-foreground">{text}</Card>
  );
}

function PostLink({
  slug,
  postNo,
  title,
  meta,
}: {
  slug: string;
  postNo: number;
  title: string;
  meta: string;
}) {
  if (!slug || !postNo) {
    return (
      <Card className="p-4">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <p className="mt-1 text-xs text-muted-foreground">{meta}</p>
      </Card>
    );
  }
  return (
    <Link
      to="/board/$slug/$postNo"
      params={{ slug, postNo: String(postNo) }}
      className="block"
    >
      <Card className="p-4 transition-colors hover:bg-muted/50">
        <p className="line-clamp-1 text-sm font-medium text-foreground">
          {title}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">{meta}</p>
      </Card>
    </Link>
  );
}

function CommentRow({
  comment,
  showAuthor = false,
}: {
  comment: DashCommentDTO;
  showAuthor?: boolean;
}) {
  const body = (
    <Card className="p-4 transition-colors hover:bg-muted/50">
      <p className="line-clamp-2 text-sm text-foreground">
        {comment.content || "(이미지 댓글)"}
      </p>
      <p className="mt-1.5 text-xs text-muted-foreground">
        {showAuthor && (
          <span className="font-medium text-foreground">{comment.author} · </span>
        )}
        {comment.categoryName} · {comment.postTitle} · {formatDate(comment.createdAt)}
      </p>
    </Card>
  );
  if (!comment.categorySlug || !comment.postNo) return body;
  return (
    <Link
      to="/board/$slug/$postNo"
      params={{ slug: comment.categorySlug, postNo: String(comment.postNo) }}
      className="block"
    >
      {body}
    </Link>
  );
}

function LikeRow({
  like,
  mode,
}: {
  like: DashLikeDTO;
  mode: "received" | "given";
}) {
  const label =
    like.targetType === "comment"
      ? `댓글: ${like.commentExcerpt || "(이미지 댓글)"}`
      : `글: ${like.postTitle}`;
  const meta =
    mode === "received"
      ? `${like.likerName || "익명"}님이 좋아요 · ${formatDate(like.createdAt)}`
      : `${like.categoryName} · ${like.postTitle} · ${formatDate(like.createdAt)}`;

  const body = (
    <Card className="flex items-center gap-3 p-4 transition-colors hover:bg-muted/50">
      <Heart className="h-4 w-4 shrink-0 fill-primary text-primary" />
      <div className="min-w-0">
        <p className="line-clamp-1 text-sm text-foreground">{label}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{meta}</p>
      </div>
    </Card>
  );
  if (!like.categorySlug || !like.postNo) return body;
  return (
    <Link
      to="/board/$slug/$postNo"
      params={{ slug: like.categorySlug, postNo: String(like.postNo) }}
      className="block"
    >
      {body}
    </Link>
  );
}
