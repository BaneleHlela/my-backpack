import { useCallback, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Share,
  Switch,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { ChevronDown, Settings } from 'lucide-react-native';
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { useSelector } from 'react-redux';
import {
  BUCKET_COLORS,
  type BucketWord,
  type VocabularyBucket,
} from '@my-backpack/shared';
import api from '../../lib/api';
import type { RootState } from '../../store/store';
import {
  bucketError,
  useBucketResource,
} from '../../features/buckets/useBucketResource';
import { Text } from '../AppText';
import { Menubar } from '../Menubar';
import { BucketAction, BucketSheet, useBucketStyles } from './BucketControls';
import { CreateBucketForm } from './CreateBucketForm';
import { BucketWordsSheet } from './BucketWordsSheet';
import { useTheme } from '../../theme/ThemeContext';

type Props = { miniAppId: string; bucketId?: string };

export function BucketWorkspace(props: Props) {
  const profileId = useSelector((s: RootState) => s.auth.activeProfile?._id);
  return props.bucketId ? (
    <BucketDetail
      key={`${profileId}:${props.bucketId}`}
      miniAppId={props.miniAppId}
      bucketId={props.bucketId}
    />
  ) : (
    <BucketList
      key={`${profileId}:${props.miniAppId}`}
      miniAppId={props.miniAppId}
    />
  );
}

function CollapsibleBucketCard({
  title,
  summary,
  accessibilityLabel,
  icon = 'chevron',
  accentColor,
  children,
}: {
  title: ReactNode;
  summary: string;
  accessibilityLabel: string;
  icon?: 'chevron' | 'settings';
  accentColor?: string;
  children: ReactNode;
}) {
  const s = useBucketStyles();
  const { colors } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const rotation = icon === 'chevron' ? 180 : 90;
  const iconStyle = useAnimatedStyle(() => ({
    transform: [
      {
        rotate: withTiming(`${expanded ? rotation : 0}deg`, {
          duration: 200,
          reduceMotion: ReduceMotion.System,
        }),
      },
    ],
  }));

  return (
    <View
      style={[
        s.card,
        accentColor ? { borderTopColor: accentColor, borderTopWidth: 6 } : null,
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${accessibilityLabel}. ${summary}`}
        accessibilityState={{ expanded }}
        onPress={() => setExpanded((value) => !value)}
        style={({ pressed }) => [s.between, { opacity: pressed ? 0.7 : 1 }]}
      >
        <View style={{ flex: 1, gap: 4 }}>
          {title}
          <Text style={s.muted}>{summary}</Text>
        </View>
        <View
          importantForAccessibility="no-hide-descendants"
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            borderWidth: 1,
            borderColor: colors.text.faint,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Animated.View style={iconStyle}>
            {icon === 'settings' ? (
              <Settings size={22} color={colors.text.primary} />
            ) : (
              <ChevronDown size={22} color={colors.text.primary} />
            )}
          </Animated.View>
        </View>
      </Pressable>
      {expanded && <View style={{ gap: 10 }}>{children}</View>}
    </View>
  );
}

function BucketList({ miniAppId }: Props) {
  const router = useRouter();
  const s = useBucketStyles();
  const { colors } = useTheme();
  const [discover, setDiscover] = useState(false);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const r = useBucketResource<{
    buckets: VocabularyBucket[];
    hasMore?: boolean;
  }>(discover ? '/vocab/buckets/discover' : '/vocab/buckets', {
    miniAppId,
    search: query,
    page,
  });
  useFocusEffect(
    useCallback(() => {
      r.reload();
    }, [r.reload])
  );
  const open = (id: string) =>
    router.push({
      pathname: '/(app)/miniapp/[miniAppId]/bucket',
      params: { miniAppId, bucketId: id },
    });
  return (
    <ScrollView
      style={s.page}
      contentContainerStyle={s.content}
      keyboardShouldPersistTaps="handled"
    >
      <Menubar
        label="Dictionary"
        onBackPress={() =>
          router.replace({
            pathname: '/(app)/miniapp/[miniAppId]',
            params: { miniAppId },
          })
        }
      />
      <Text style={s.title}>My buckets</Text>
      <Text style={s.muted}>A home for every word you want to learn.</Text>
      <View style={s.row}>
        <BucketAction tone="lime" onPress={() => setCreating(true)}>
          + Create bucket
        </BucketAction>
        <BucketAction
          onPress={() =>
            router.push({
              pathname: '/quiz/modes/dictionary/[miniAppId]',
              params: { miniAppId },
            })
          }
        >
          Quiz
        </BucketAction>
      </View>
      <View style={s.row}>
        {[false, true].map((v) => (
          <BucketAction
            key={String(v)}
            tone={discover === v ? 'violet' : 'neutral'}
            onPress={() => {
              setDiscover(v);
              setPage(1);
              setSearch('');
              setQuery('');
            }}
          >
            {v ? 'Discover public' : 'My buckets'}
          </BucketAction>
        ))}
      </View>
      {discover && (
        <View style={{ gap: 10 }}>
          <TextInput
            style={s.input}
            accessibilityLabel="Search public buckets"
            placeholder="Search public buckets"
            placeholderTextColor={colors.text.muted}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
            onSubmitEditing={() => {
              setQuery(search);
              setPage(1);
            }}
            maxLength={60}
          />
          <BucketAction
            tone="neutral"
            onPress={() => {
              setQuery(search);
              setPage(1);
            }}
          >
            Search
          </BucketAction>
        </View>
      )}
      {r.loading && <ActivityIndicator color={colors.primary.DEFAULT} />}
      {r.error && (
        <>
          <Text style={s.error}>{r.error}</Text>
          <BucketAction onPress={r.reload}>Retry</BucketAction>
        </>
      )}
      {r.data?.buckets.length === 0 && (
        <View style={s.card}>
          <Text style={s.heading}>
            {discover ? 'No public buckets found' : 'Create your first bucket'}
          </Text>
          <Text style={s.muted}>
            {discover
              ? 'Try another search, or create a collection of your own.'
              : 'Create a bucket, then add words from the dictionary.'}
          </Text>
          <BucketAction onPress={() => setCreating(true)}>
            Create bucket
          </BucketAction>
        </View>
      )}
      {r.data?.buckets.map((b) => (
        <Pressable
          key={b._id}
          accessibilityRole="button"
          onPress={() => open(b._id)}
          style={[s.card, { borderLeftWidth: 6, borderLeftColor: b.color }]}
        >
          <Text style={s.heading}>
            {b.isFavorites ? '★ ' : ''}
            {b.name}
          </Text>
          {!!b.description && <Text style={s.text}>{b.description}</Text>}
          <Text style={s.muted}>
            {b.entryCount} saved meanings · {b.visibility}
            {b.isOwner
              ? ` · ${b.includeInQuiz ? 'Included in quizzes' : 'Excluded by default'}`
              : ''}
          </Text>
          {b.entryCount === 0 && b.isOwner && (
            <Text style={s.text}>Add your first words →</Text>
          )}
        </Pressable>
      ))}
      {discover && (
        <View style={s.row}>
          <BucketAction
            tone="neutral"
            disabled={page === 1 || r.loading}
            onPress={() => setPage(page - 1)}
          >
            Previous
          </BucketAction>
          <Text style={s.muted}>Page {page}</Text>
          <BucketAction
            tone="neutral"
            disabled={!r.data?.hasMore || r.loading}
            onPress={() => setPage(page + 1)}
          >
            Next
          </BucketAction>
        </View>
      )}
      {creating && (
        <BucketSheet title="New bucket" onClose={() => setCreating(false)}>
          <CreateBucketForm
            miniAppId={miniAppId}
            onCancel={() => setCreating(false)}
            onCreated={(b) => {
              setCreating(false);
              r.reload();
              open(b._id);
            }}
          />
        </BucketSheet>
      )}
    </ScrollView>
  );
}

function BucketDetail({
  miniAppId,
  bucketId,
}: {
  miniAppId: string;
  bucketId: string;
}) {
  const router = useRouter();
  const s = useBucketStyles();
  const { colors } = useTheme();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('all');
  const [sort, setSort] = useState('recent');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const r = useBucketResource<{
    bucket: VocabularyBucket;
    words: BucketWord[];
    hasMore: boolean;
  }>(`/vocab/buckets/${bucketId}`, { page, status, sort, search: query });
  useFocusEffect(
    useCallback(() => {
      r.reload();
    }, [r.reload])
  );
  const b = r.data?.bucket;
  const sortOptions = [
    ['recent', 'Recent'],
    ['alphabetical', 'A–Z'],
    ...(b?.isOwner
      ? [
          ['confidence', 'Confidence'],
          ['accuracy', 'Accuracy'],
          ['lastPracticed', 'Last practised'],
          ['dueForReview', 'Due for review'],
        ]
      : []),
  ];
  const sortLabel =
    sortOptions.find(([value]) => value === sort)?.[1] ?? 'Recent';
  const statusLabel =
    status === 'all' ? 'All words' : status[0].toUpperCase() + status.slice(1);
  const back = () =>
    router.replace({
      pathname: '/(app)/miniapp/[miniAppId]/bucket',
      params: { miniAppId },
    });
  const run = async (work: () => Promise<unknown>) => {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await work();
      r.reload();
    } catch (e) {
      setError(bucketError(e));
    } finally {
      setBusy(false);
    }
  };
  const remove = (w: BucketWord) =>
    Alert.alert(
      'Remove this meaning?',
      `Remove “${w.word}” from ${b?.name}? Your learning progress is kept.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () =>
            void run(() =>
              api.delete(`/vocab/buckets/${bucketId}/entries/${w._id}`)
            ),
        },
      ]
    );
  return (
    <ScrollView
      style={s.page}
      contentContainerStyle={s.content}
      keyboardShouldPersistTaps="handled"
    >
      <Menubar label="My buckets" onBackPress={back} />
      {r.loading && <ActivityIndicator color={colors.primary.DEFAULT} />}
      {(error || r.error) && (
        <>
          <Text style={s.error}>{error || r.error}</Text>
          <BucketAction onPress={r.reload}>Reload bucket</BucketAction>
        </>
      )}
      {b && (
        <>
          <CollapsibleBucketCard
            title={
              <Text style={s.title}>
                {b.isFavorites ? '★ ' : ''}
                {b.name}
              </Text>
            }
            summary={`${b.entryCount} saved meanings · ${b.visibility}`}
            accessibilityLabel={`${b.name} bucket details and settings`}
            accentColor={b.color}
          >
            {!!b.description && <Text style={s.text}>{b.description}</Text>}
            {b.isOwner ? (
              <>
                <View style={s.between}>
                  <Text style={[s.text, { flex: 1 }]}>
                    Include in quizzes by default
                  </Text>
                  <Switch
                    accessibilityLabel="Include in quizzes by default"
                    disabled={busy}
                    value={b.includeInQuiz}
                    onValueChange={(includeInQuiz) =>
                      void run(() =>
                        api.patch(`/vocab/buckets/${bucketId}`, {
                          includeInQuiz,
                        })
                      )
                    }
                  />
                </View>
                <Text style={s.muted}>
                  Each quiz can use these defaults or its own bucket choices.
                </Text>
                <View style={s.row}>
                  <BucketAction
                    tone="lime"
                    disabled={busy}
                    onPress={() => setAdding(true)}
                  >
                    + Add words
                  </BucketAction>
                  <BucketAction
                    disabled={busy || !b.entryCount}
                    onPress={() =>
                      router.push({
                        pathname: '/quiz/modes/dictionary/[miniAppId]',
                        params: { miniAppId: b.miniAppId, bucketId },
                      })
                    }
                  >
                    Quiz this bucket
                  </BucketAction>
                  <BucketAction
                    tone="neutral"
                    disabled={busy}
                    onPress={() => setEditing(true)}
                  >
                    Edit bucket
                  </BucketAction>
                </View>
              </>
            ) : (
              <>
                <Text style={s.muted}>
                  Save a private copy to edit it and use it in your quizzes.
                </Text>
                <BucketAction
                  tone="lime"
                  disabled={busy}
                  onPress={() =>
                    void run(async () => {
                      const res = await api.post(
                        `/vocab/buckets/${bucketId}/copy`
                      );
                      router.replace({
                        pathname: '/(app)/miniapp/[miniAppId]/bucket',
                        params: {
                          miniAppId: b.miniAppId,
                          bucketId: res.data.data.bucketId,
                        },
                      });
                    })
                  }
                >
                  {busy ? 'Saving…' : 'Save a copy'}
                </BucketAction>
              </>
            )}
            {b.visibility === 'public' && (
              <BucketAction
                tone="neutral"
                disabled={busy}
                onPress={() =>
                  void run(() =>
                    Share.share({
                      message: `${b.name}\n${Linking.createURL(`/miniapp/${b.miniAppId}/bucket`, { queryParams: { bucketId } })}`,
                    })
                  )
                }
              >
                Share bucket
              </BucketAction>
            )}
          </CollapsibleBucketCard>
          <CollapsibleBucketCard
            title={<Text style={s.heading}>Filter & sort</Text>}
            summary={b.isOwner ? `${statusLabel} · ${sortLabel}` : sortLabel}
            accessibilityLabel="Word filters and sorting"
            icon="settings"
          >
            {b.isOwner && (
              <>
                <Text style={s.text}>Filter by status</Text>
                <View style={s.row}>
                  {['all', 'learning', 'mastered', 'paused'].map((v) => (
                    <BucketAction
                      key={v}
                      tone={status === v ? 'violet' : 'neutral'}
                      onPress={() => {
                        setStatus(v);
                        setPage(1);
                      }}
                    >
                      {v[0].toUpperCase() + v.slice(1)}
                    </BucketAction>
                  ))}
                </View>
              </>
            )}
            <Text style={s.text}>Sort words</Text>
            <View style={s.row}>
              {sortOptions.map(([value, label]) => (
                <BucketAction
                  key={value}
                  tone={sort === value ? 'violet' : 'neutral'}
                  onPress={() => {
                    setSort(value);
                    setPage(1);
                  }}
                >
                  {label}
                </BucketAction>
              ))}
            </View>
          </CollapsibleBucketCard>
          <TextInput
            style={s.input}
            accessibilityLabel="Find a word in this bucket"
            placeholder="Find a word in this bucket"
            placeholderTextColor={colors.text.muted}
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={() => {
              setQuery(search);
              setPage(1);
            }}
            returnKeyType="search"
            maxLength={60}
          />
          <BucketAction
            tone="neutral"
            onPress={() => {
              setQuery(search);
              setPage(1);
            }}
          >
            Search words
          </BucketAction>
          {!r.data?.words.length && (
            <View style={s.card}>
              <Text style={s.heading}>
                {b.entryCount
                  ? 'No words match this view'
                  : 'Your next word starts here'}
              </Text>
              <Text style={s.muted}>
                {b.entryCount
                  ? 'Try another search or status filter.'
                  : 'Add words, paste a collection, or ask for word ideas.'}
              </Text>
              {b.isOwner && (
                <BucketAction onPress={() => setAdding(true)}>
                  Add words
                </BucketAction>
              )}
            </View>
          )}
          {r.data?.words.map((w) => (
            <View key={w._id} style={s.card}>
              <Pressable
                accessibilityRole="button"
                onPress={() =>
                  router.push({
                    pathname: '/(app)/miniapp/[miniAppId]/term/[termId]',
                    params: { miniAppId: b.miniAppId, termId: w.termId },
                  })
                }
              >
                <Text style={s.heading}>{w.word} ↗</Text>
              </Pressable>
              <Text style={s.muted}>{w.partOfSpeech}</Text>
              <Text style={s.text}>{w.definition}</Text>
              {b.isOwner && (
                <>
                  <Text style={s.muted}>
                    {w.status} · {Math.round((w.confidenceScore ?? 0) * 100)}%
                    confidence
                  </Text>
                  <View style={s.row}>
                    <BucketAction
                      disabled={busy}
                      tone="neutral"
                      onPress={() =>
                        void run(() =>
                          api.patch(
                            `/vocab/buckets/${bucketId}/entries/${w._id}`,
                            { paused: w.status !== 'paused' }
                          )
                        )
                      }
                    >
                      {w.status === 'paused' ? 'Resume' : 'Pause'}
                    </BucketAction>
                    <BucketAction
                      disabled={busy}
                      tone="neutral"
                      onPress={() => remove(w)}
                    >
                      Remove
                    </BucketAction>
                  </View>
                </>
              )}
            </View>
          ))}
          <View style={s.row}>
            <BucketAction
              tone="neutral"
              disabled={page === 1 || busy}
              onPress={() => setPage(page - 1)}
            >
              Previous
            </BucketAction>
            <Text style={s.muted}>Page {page}</Text>
            <BucketAction
              tone="neutral"
              disabled={!r.data?.hasMore || busy}
              onPress={() => setPage(page + 1)}
            >
              Next
            </BucketAction>
          </View>
          {adding && (
            <BucketWordsSheet
              bucket={b}
              onClose={() => setAdding(false)}
              onSaved={r.reload}
            />
          )}
          {editing && (
            <EditBucket
              bucket={b}
              onClose={() => setEditing(false)}
              onSaved={() => {
                setEditing(false);
                r.reload();
              }}
              onDeleted={back}
            />
          )}
        </>
      )}
    </ScrollView>
  );
}

function EditBucket({
  bucket,
  onClose,
  onSaved,
  onDeleted,
}: {
  bucket: VocabularyBucket;
  onClose: () => void;
  onSaved: () => void;
  onDeleted: () => void;
}) {
  const s = useBucketStyles();
  const { colors } = useTheme();
  const [name, setName] = useState(bucket.name);
  const [description, setDescription] = useState(bucket.description);
  const [color, setColor] = useState(bucket.color);
  const [isPublic, setPublic] = useState(bucket.visibility === 'public');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const run = async (deleting = false) => {
    setBusy(true);
    setError('');
    try {
      if (deleting) {
        await api.delete(`/vocab/buckets/${bucket._id}`);
        onDeleted();
      } else {
        await api.patch(`/vocab/buckets/${bucket._id}`, {
          name,
          description,
          color,
          visibility: isPublic ? 'public' : 'private',
        });
        onSaved();
      }
    } catch (e) {
      setError(bucketError(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <BucketSheet
      title="Edit bucket"
      busy={busy}
      onClose={onClose}
      footer={
        <BucketAction
          disabled={busy || !name.trim()}
          onPress={() => void run()}
        >
          Save changes
        </BucketAction>
      }
    >
      <Text style={s.text}>Name</Text>
      <TextInput
        style={s.input}
        accessibilityLabel="Bucket name"
        value={name}
        onChangeText={setName}
        maxLength={60}
        editable={!bucket.isFavorites && !busy}
      />
      <Text style={s.text}>Description</Text>
      <TextInput
        style={s.input}
        accessibilityLabel="Bucket description"
        value={description}
        onChangeText={setDescription}
        maxLength={240}
        multiline
        editable={!busy}
      />
      <View style={s.row}>
        {BUCKET_COLORS.map((c) => (
          <Pressable
            key={c}
            accessibilityRole="radio"
            accessibilityLabel={'Colour ' + c}
            accessibilityState={{ selected: color === c }}
            onPress={() => setColor(c)}
            style={{
              backgroundColor: c,
              width: 40,
              height: 40,
              borderRadius: 20,
              borderWidth: color === c ? 3 : 0,
              borderColor: colors.text.primary,
            }}
          />
        ))}
      </View>
      <View style={s.between}>
        <Text style={s.text}>Public bucket</Text>
        <Switch
          accessibilityLabel="Public bucket"
          value={isPublic}
          onValueChange={setPublic}
          disabled={busy}
        />
      </View>
      <Text style={s.muted}>
        {isPublic
          ? 'Anyone using this dictionary can find these words and save a copy. Your learning progress stays private. Existing copies remain if you make this private later.'
          : 'Only this profile can see this bucket.'}
      </Text>
      {!!error && <Text style={s.error}>{error}</Text>}
      {!bucket.isFavorites && (
        <BucketAction
          tone="neutral"
          disabled={busy}
          onPress={() =>
            Alert.alert(
              'Delete bucket?',
              `Delete “${bucket.name}” and its saved words? Your other buckets and learning progress are kept.`,
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete',
                  style: 'destructive',
                  onPress: () => void run(true),
                },
              ]
            )
          }
        >
          Delete bucket
        </BucketAction>
      )}
    </BucketSheet>
  );
}
