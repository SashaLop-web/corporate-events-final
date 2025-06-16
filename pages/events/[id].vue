<template>
  <div class="event-detail" v-if="event">
    <h1>{{ event.title }}</h1>

    <p class="meta">
      <span>📅 {{ formatDateTime(event.event_date) }}</span>
      <span> | 🏷️ {{ formatType(event.type) }}</span>
    </p>

    <div class="details">
      <p><strong>Анонсировано:</strong> {{ event.is_announced ? 'Да' : 'Нет' }}</p>
      <p><strong>Создано:</strong> {{ formatDateTime(event.created_at) }}</p>
      <p v-if="event.location"><strong>📍 Место:</strong> {{ event.location }}</p>
      <p v-if="event.location_comment"><strong>💬 Комментарий:</strong> {{ event.location_comment }}</p>
      <p v-if="event.description"><strong>📝 Описание:</strong> {{ event.description }}</p>
    </div>

    <div class="participants" v-if="participants.length">
      <h2>Участники</h2>
      <table>
        <thead>
          <tr>
            <th>ФИО</th>
            <th>Роль</th>
            <th>Отдел</th>
            <th>Статус</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in participants" :key="p.user_id">
            <td>{{ p.full_name }}</td>
            <td>{{ p.role }}</td>
            <td>{{ p.department || '—' }}</td>
            <td>
              <span v-if="p.response_status === 'accepted'">✅ Подтвердил</span>
              <span v-else-if="p.response_status === 'declined'">❌ Отклонил</span>
              <span v-else>⏳ Без ответа</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <button class="back-button" @click="router.push('/admin-dashboard')">
      ← Назад в админ-панель
    </button>
  </div>
</template>

<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import { ref, onMounted } from 'vue'
import { useFetch } from '#app'

interface EventData {
  id: number
  title: string
  event_date: string
  type: string
  is_announced: boolean
  created_at: string
  location?: string
  location_comment?: string
  description?: string
}

interface Participant {
  user_id: number
  full_name: string
  email: string
  role: string
  department: string | null
  response_status: string | null
}

const route = useRoute()
const router = useRouter()
const event = ref<EventData | null>(null)
const participants = ref<Participant[]>([])

onMounted(async () => {
  try {
    const token = localStorage.getItem('authToken')
    if (!token) return

    const { data, error } = await useFetch<{
      event: EventData
      participants: Participant[]
    }>(`/api/events/${route.params.id}`, {
      headers: { Authorization: `Bearer ${token}` }
    })

    if (error.value) throw new Error(error.value.message)

    event.value = data.value?.event || null
    participants.value = data.value?.participants || []
  } catch (err) {
    console.error('Ошибка загрузки мероприятия:', err)
  }
})

const formatDateTime = (d: string) =>
  new Date(d).toLocaleString('ru-RU', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })

const formatType = (type: string) => {
  const map: Record<string, string> = {
    meeting_individual: 'Встреча с сотрудниками',
    meeting_department: 'Встреча по отделу',
    teambuilding: 'Тимбилдинг',
    training: 'Обучение / Воркшоп',
    corporate: 'Корпоративный праздник',
    presentation: 'Презентация / Конференция'
  }
  return map[type] || type
}
</script>

  
  <style scoped>
  .event-detail {
    max-width: 800px;
    margin: 100px auto;
    padding: 30px;
    background: #f9f9f9;
    border-left: 6px solid #ff9800;
    border-radius: 10px;
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
    font-family: 'Segoe UI', sans-serif;
    color: #222;
  }
  
  h1 {
    font-size: 28px;
    color: #222;
    margin-bottom: 10px;
  }
  
  .meta {
    font-size: 14px;
    color: #666;
    margin-bottom: 20px;
  }
  
  .details p {
    font-size: 15px;
    margin: 6px 0;
    color: #333;
  }
  
  .participants {
    margin-top: 40px;
  }
  
  .participants h2 {
    font-size: 20px;
    margin-bottom: 10px;
    color: #333;
  }
  
  table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 10px;
    background: #fff;
    border: 1px solid #ddd;
  }
  
  th,
  td {
    text-align: left;
    padding: 12px 10px;
    border-bottom: 1px solid #ccc;
    font-size: 14px;
  }
  
  th {
    background-color: #333;
    color: #fff;
  }
  
  td {
    background-color: #f5f5f5;
  }
  
  .back-button {
    margin-top: 30px;
    padding: 10px 20px;
    background-color: #ff9800;
    color: #fff;
    border: none;
    border-radius: 6px;
    font-size: 15px;
    cursor: pointer;
    transition: background-color 0.2s ease;
  }
  
  .back-button:hover {
    background-color: #e68900;
  }
  </style>
  