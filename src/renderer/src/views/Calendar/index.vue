<template>
  <div class="calendar-page" v-loading="isLoading">
    <!-- <div class="calendar-header">
      <div class="calendar-title">{{ $t('calendar.title') }}</div>
      <div class="controls">
        <el-button @click="refreshCalendar" icon="Refresh">刷新</el-button>
        <el-button @click="goToToday">回到今天</el-button>
      </div>
    </div> -->
    <div class="calendar-wrapper">
      <Calendar ref="calendarRef" :events="events" @dateClick="handleDateClick" @eventClick="handleEventClick"
        @datesSet="handleDatesSet" @calendarReady="handleCalendarReady" />
    </div>

    <!-- 添加事件的对话框 -->
    <!-- <el-dialog v-model="dialogVisible" title="添加日程" width="500px">
      <el-form :model="eventForm" label-width="80px">
        <el-form-item label="标题">
          <el-input v-model="eventForm.title" placeholder="请输入日程标题" />
        </el-form-item>
        <el-form-item label="开始时间">
          <el-date-picker 
            v-model="eventForm.start" 
            type="datetime" 
            format="YYYY-MM-DD HH:mm"
            placeholder="选择开始时间"
          />
        </el-form-item>
        <el-form-item label="结束时间">
          <el-date-picker 
            v-model="eventForm.end" 
            type="datetime" 
            format="YYYY-MM-DD HH:mm"
            placeholder="选择结束时间"
          />
        </el-form-item>
        <el-form-item label="颜色">
          <el-color-picker v-model="eventForm.backgroundColor" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input 
            v-model="eventForm.description" 
            type="textarea" 
            rows="3"
            placeholder="请输入日程备注信息"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="saveEvent">确定</el-button>
        </span>
      </template>
    </el-dialog> -->

    <!-- 添加会议详情弹窗 -->
    <el-dialog v-model="eventDetailVisible" :title="t('calendar.eventDetail')" min-width="500px">
      <div v-if="selectedEvent" class="event-detail">
        <div class="detail-item">
          <div class="item-label">{{ t('calendar.eventTitle') }}：</div>
          <div class="item-content">{{ selectedEvent.title }}</div>
        </div>
        <div class="detail-item">
          <div class="item-label">{{ t('calendar.location') }}：</div>
          <div class="item-content">{{ selectedEvent.extendedProps?.room || t('calendar.noLocation') }}</div>
        </div>
        <div class="detail-item">
          <div class="item-label">{{ t('calendar.startTime') }}：</div>
          <div class="item-content">{{ formatDateTime(selectedEvent.start) }}</div>
        </div>
        <div class="detail-item">
          <div class="item-label">{{ t('calendar.endTime') }}：</div>
          <div class="item-content">{{ formatDateTime(selectedEvent.end) }}</div>
        </div>
        <div class="detail-item">
          <div class="item-label">{{ t('calendar.eventDescription') }}：</div>
          <div class="item-content" v-if="selectedEvent.extendedProps?.description"
            v-html="selectedEvent.extendedProps?.description"></div>
          <div class="item-content" v-if="!selectedEvent.extendedProps?.description">
            {{ t('calendar.noDescription') }}
          </div>
        </div>
        <div class="detail-item">
          <div class="item-label">{{ t('calendar.organizer') }}：</div>
          <div class="item-content">
            {{ selectedEvent.extendedProps?.organizer?.name || t('calendar.noOrganizer') }}
            <span v-if="selectedEvent.extendedProps?.organizer?.email">
              ({{ selectedEvent.extendedProps.organizer.email }})
            </span>
          </div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>

import * as ICAL from 'ical'
import { decode } from 'js-base64'

// 获取国际化函数
const { t } = useI18n()
const store = useAppStore()
const calendarRef = ref(null);

// 初始化events为空数组
const events = ref([]);
const isLoading = ref(false); // 添加loading状态变量

// 添加定时刷新
let refreshTimer = null;
const calendarReady = ref(false); // 添加一个标记来跟踪日历是否已准备好

const calendarInstance = ref(null);
const isCollapse = computed(() => store.sidebarCollapse)
const dialogVisible = ref(false);
const eventForm = reactive({
  title: '',
  start: '',
  end: '',
  backgroundColor: '#409eff',
  description: '',
  room: '',
  organizer: {},
  attendees: []
});

const selectedDate = ref(null);
const eventDetailVisible = ref(false);
const selectedEvent = ref(null);

// 添加上次请求的参数和时间记录
const lastRequestParams = ref(null);
const lastRequestTime = ref(null);
const REQUEST_DEBOUNCE_TIME = 2000;

const handleDateClick = (info) => {
  // 点击日期时，打开添加事件对话框，默认选择该日期
  selectedDate.value = info.date;
  
  const startDate = new Date(info.date);
  startDate.setHours(9, 0, 0);
  
  const endDate = new Date(info.date);
  endDate.setHours(10, 0, 0);
  
  eventForm.title = '';
  eventForm.start = startDate;
  eventForm.end = endDate;
  eventForm.backgroundColor = '#409eff';
  eventForm.description = '';
  
  dialogVisible.value = true;
};

const formatDateTime = (dateObj) => {
  if (!dateObj) return '';
  return dayjs(dateObj).format('YYYY-MM-DD HH:mm');
};

const handleEventClick = (info) => {
  // 保存当前点击的事件
  selectedEvent.value = info.event;
  // 显示详情弹窗
  eventDetailVisible.value = true;
};

const addEvent = () => {
  // 手动打开添加事件对话框
  const now = new Date();
  const startDate = new Date(now);
  startDate.setHours(9, 0, 0);
  
  const endDate = new Date(now);
  endDate.setHours(10, 0, 0);
  
  eventForm.title = '';
  eventForm.start = startDate;
  eventForm.end = endDate;
  eventForm.backgroundColor = '#409eff';
  eventForm.description = '';
  
  dialogVisible.value = true;
};

const saveEvent = () => {
  if (!eventForm.title) {
    ElMessage.warning(t('calendar.titleRequired'));
    return;
  }
  
  if (!eventForm.start || !eventForm.end) {
    ElMessage.warning(t('calendar.timeRequired'));
    return;
  }
  
  // 添加新事件
  const newEvent = {
    id: String(Date.now()),
    title: eventForm.title,
    start: eventForm.start.toISOString(),
    end: eventForm.end.toISOString(),
    backgroundColor: eventForm.backgroundColor,
    description: eventForm.description,
    room: eventForm.room,
    organizer: eventForm.organizer,
    attendees: [...eventForm.attendees]
  };
  
  events.value.push(newEvent);
  
  // 关闭对话框
  dialogVisible.value = false;
  
  // 刷新日历
  if (calendarRef.value) {
    calendarRef.value.refetchEvents();
  }
  
  ElMessage.success(t('calendar.eventSaved'));
};

const goToToday = () => {
  if (calendarRef.value) {
    calendarRef.value.gotoDate(new Date());
  }
};

// 添加参会人员
const addAttendee = () => {
  eventForm.attendees.push({ name: '', optional: false });
};

// 移除参会人员
const removeAttendee = (index) => {
  eventForm.attendees.splice(index, 1);
};

// 计算属性：必选参会人员
const requiredAttendees = computed(() => {
  if (!selectedEvent.value?.extendedProps?.attendees) return [];
  return selectedEvent.value.extendedProps.attendees.filter(a => !a.optional);
});

// 计算属性：可选参会人员
const optionalAttendees = computed(() => {
  if (!selectedEvent.value?.extendedProps?.attendees) return [];
  return selectedEvent.value.extendedProps.attendees.filter(a => a.optional);
});

// 窗口大小变化处理函数
const handleResize = () => {
  if (calendarRef.value) {
    calendarRef.value.refresh();
  }
};

// 添加日历视图范围变化监听
const handleDatesSet = () => {
  fetchMeetingData();
}

// 获取会议数据的方法
const fetchMeetingData = async (force = false) => {
  const currentView = calendarInstance.value?.view || calendarRef.value?.calendar?.view;
  if (!currentView) return
  // 使用 activeStart 和 activeEnd 获取完整视图范围（包括显示的上下月日期）
  const params = {
    start: dayjs(currentView.activeStart).format('YYYY-MM-DDTHH:mm:ss'),
    end: dayjs(currentView.activeEnd).format('YYYY-MM-DDTHH:mm:ss')
  };
  
  // 检查是否是相同参数的请求
  const now = new Date();
  const isSameParams = lastRequestParams.value && 
                      lastRequestParams.value.start === params.start &&
                      lastRequestParams.value.end === params.end;
  
  // 如果是相同参数且在2秒内的重复请求，则跳过（除非强制刷新）
  if (!force && isSameParams && lastRequestTime.value) {
    const timeDiff = now.getTime() - lastRequestTime.value.getTime();
    if (timeDiff < REQUEST_DEBOUNCE_TIME) return
  }
  
  lastRequestParams.value = { ...params };
  lastRequestTime.value = now;
  
  try {
    isLoading.value = true; // 开始加载，显示loading状态
    const response = (await getCalendarData(params)).data;
    const allParsedEvents = [];
    response.forEach(item => {
      try {
        const icsData = decode(item);
        const parsedEvents = parseICSToJSON(icsData);
        allParsedEvents.push(...parsedEvents);
      } catch (error) {
        console.error('解析日历事件失败:', error);
      }
    });
    events.value = _.uniqBy([...events.value, ...allParsedEvents], (o) => {
     return `${o.id}_${o.title}_${o.start}_${o.end}` 
    });
  } catch (error) {
    console.error('获取或处理日历数据失败:', error);
  } finally {
    isLoading.value = false;
  }
}

// 强制刷新日历数据
const refreshCalendar = () => {
  fetchMeetingData(true);
};

const handleCalendarReady = (instance) => {
  calendarReady.value = true;
  calendarInstance.value = instance;
  fetchMeetingData();
};

// 将ICS格式解析回JSON
const parseICSToJSON = (icsData) => {
  try {
    const parsedData = ICAL.parseICS(icsData);
    const events = [];
    Object.values(parsedData).forEach((event, index) => {
      if (event.type !== 'VEVENT') return;
      const colors = ['#409eff', '#67c23a', '#e6a23c', '#f56c6c', '#909399'];
      const backgroundColor = colors[index % colors.length];
      events.push({
        id: event.uid || String(Date.now() + index),
        title: event.summary.val || t('calendar.unnamedEvent'),
        start: event.start?.toISOString() || new Date().toISOString(),
        end: event.end?.toISOString() || new Date().toISOString(),
        backgroundColor: backgroundColor,
        description: event.description.val || '',
        room: event.location.val || '',
        organizer: {
          name: (event.organizer && event.organizer.params && event.organizer.params.CN) || '',
          email: event.organizer ? event.organizer.val.replace('MAILTO:', '') : ''
        },
      });
    });
    return events;
  } catch (error) {
    return [];
  }
};

onMounted(() => {
  refreshTimer = setInterval(() => {
    fetchMeetingData();
  }, 2 * 60 * 1000);
});

onUnmounted(() => {
  if (refreshTimer) {
    clearInterval(refreshTimer);
  }
});

watch(() => isCollapse.value, (newValue) => {
  if (newValue) {
    // 收缩时立即刷新，无需延迟
    handleResize();
  } else {
    // 展开时使用较小的延迟
    setTimeout(() => {
      handleResize();
    }, 300);
  }
}, { immediate: false });
</script>

<style lang="stylus" scoped>
.calendar-page
  padding 20px
  padding-bottom 40px
  height 100%
  display flex
  flex-direction column

.calendar-header
  margin-bottom 20px
  display flex
  justify-content space-between
  align-items center
  .calendar-title
    font-family: Source Han Sans CN;
    font-weight: 500;
    font-size: 24px;
    color: #333333
.controls
  display flex
  gap 10px

.calendar-wrapper
  flex 1
  min-height 600px
  margin-bottom 48px

.event-detail
  .detail-item
    display flex
    margin-bottom 12px
    
    .item-label
      width 80px
      font-weight bold
      flex-shrink 0
    
    .item-content
      flex 1
      
  .attendees-list
    .attendee
      margin-bottom 4px
      
      &.required
        color #444
        font-weight 400
      
      &.optional
        color #666
        
      .optional-tag
        color #999
        font-size 12px
        margin-left 4px
</style>
