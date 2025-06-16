<template>
  <div class="notifications-page">
    <h1>Все уведомления</h1>

    <div v-if="notifications.length === 0" class="empty">
      У вас нет уведомлений.
    </div>

    <ul v-else class="notification-list">
      <li
        v-for="n in sortedNotifications"
        :key="n.id"
        class="notification-item"
        :class="{ unread: !n.is_read }"
        @click="goToNotification(n.id)"
        style="cursor: pointer"
      >
        <div class="header">
          <p class="message">{{ n.message }}</p>
          <span class="read-status">{{ n.is_read ? '✔ Прочитано' : '🕒 Новое' }}</span>
        </div>
        <p v-if="n.title" class="title">Мероприятие: <strong>{{ n.title }}</strong></p>
        <p v-if="n.event_type" class="type">Тип: {{ formatType(n.event_type) }}</p>
        <p v-if="n.event_date" class="date">Дата: {{ formatDateTime(n.event_date) }}</p>
        <p v-if="n.location" class="location">Место: {{ n.location }}</p>
        <p v-if="n.location_comment" class="location-comment">Комментарий к месту: {{ n.location_comment }}</p>
        <small class="timestamp">{{ formatDateTime(n.created_at) }}</small>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useFetch } from '#app'
import { useRouter } from 'vue-router'

const router = useRouter()

interface Notification {
  id: number
  message: string
  is_read: boolean
  created_at?: string
  event_type?: string
  event_date?: string
  title?: string
  location?: string
  location_comment?: string
}

const notifications = ref<Notification[]>([])

onMounted(async () => {
  try {
    const token = localStorage.getItem('authToken')
    if (!token) throw new Error('Токен отсутствует')

    const { data, error } = await useFetch<{ notifications: Notification[] }>('/api/notifications', {
      headers: { Authorization: `Bearer ${token}` }
    })

    if (error.value) {
      console.error('Ошибка загрузки уведомлений:', error.value)
      return
    }

    // ✅ исправлено: безопасная установка списка
    notifications.value = Array.isArray(data.value)
      ? data.value
      : data.value?.notifications || []
  } catch (err: any) {
    console.error('Ошибка при загрузке:', err.message)
  }
})

const sortedNotifications = computed(() =>
  notifications.value.slice().sort((a, b) =>
    new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime()
  )
)

const formatDateTime = (dateStr?: string) => {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleString('ru-RU', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const formatType = (type?: string) => {
  const map: Record<string, string> = {
    meeting_individual: 'Встреча с сотрудниками',
    meeting_department: 'Встреча по отделу',
    teambuilding: 'Тимбилдинг',
    training: 'Обучение / Воркшоп',
    corporate: 'Корпоративный праздник',
    presentation: 'Презентация / Конференция'
  }
  return type ? map[type] || type : 'Неизвестно'
}

async function goToNotification(id: number) {
  try {
    const token = localStorage.getItem('authToken')
    if (!token) throw new Error('Нет токена')

    await fetch('/api/notifications/read', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ ids: [id] })
    })

    router.push(`/notifications/${id}`)
  } catch (err) {
    console.error('Ошибка при отметке уведомления как прочитанного:', err)
    router.push(`/notifications/${id}`)
  }
}
</script>


<style scoped>
.notifications-page {
  max-width: 820px;
  margin: 100px auto;
  padding: 30px;
  font-family: 'Segoe UI', sans-serif;
  background-color: #fff;
  border-radius: 10px;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.06);
  color: #222;
}

h1 {
  font-size: 26px;
  margin-bottom: 20px;
  color: #111;
}

.notification-list {
  list-style: none;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.notification-item {
  padding: 16px 20px;
  border-left: 5px solid #4caf50;
  background-color: #f7f7f7;
  border-radius: 8px;
  transition: background-color 0.2s ease;
}

.notification-item:hover {
  background-color: #ececec;
}

.notification-item.unread {
  border-left-color: #ff9800;
  background-color: #fff6e5;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.read-status {
  font-size: 13px;
  color: #666;
  font-weight: 500;
}

.message {
  font-size: 16px;
  font-weight: 600;
  color: #222;
}

.title,
.type,
.date,
.location,
.location-comment {
  font-size: 14px;
  color: #444;
  margin-top: 4px;
}

.timestamp {
  display: block;
  margin-top: 10px;
  font-size: 12px;
  color: #888;
}

.empty {
  padding: 60px 0;
  text-align: center;
  font-size: 18px;
  color: #666;
}
</style>

