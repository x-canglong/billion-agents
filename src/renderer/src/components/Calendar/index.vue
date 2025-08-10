<template>
  <div class="calendar-container">
    <div :key="calendarKey" ref="calendarEl" class="calendar" :class="{'calendar-en': locale === 'en-US'}"></div>
  </div>
</template>

<script setup>
import { Calendar } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import zhCnLocale from '@fullcalendar/core/locales/zh-cn';
import enLocale from '@fullcalendar/core/locales/en-gb';

const props = defineProps({
  events: {
    type: Array,
    default: () => []
  },
  initialDate: {
    type: Date,
    default: () => new Date()
  },
  forceRefresh: { // 添加新的prop用于外部控制刷新
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['dateClick', 'eventClick', 'eventsSet', 'datesSet', 'calendarReady']);

const { locale } = useI18n()
const calendarEl = ref(null);
const calendarKey = ref(0); // 添加key用于强制刷新
const calendarInstance = ref(null); // 将calendar改为响应式ref

// 根据当前语言获取日历本地化配置
const getCalendarLocale = () => {
  return locale.value === 'en-US' ? enLocale : zhCnLocale
}

// 将日历初始化逻辑抽取为函数
const initCalendar = () => {
  if (calendarEl.value) {
    // 如果已存在日历实例，先销毁
    if (calendarInstance.value) {
      calendarInstance.value.destroy();
      calendarInstance.value = null;
    }
    
    calendarInstance.value = new Calendar(calendarEl.value, {
      plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
      headerToolbar: {
        left: 'prev,next',
        center: 'title',
        right: 'today dayGridMonth,timeGridWeek,timeGridDay'
      },
      initialView: 'dayGridMonth',
      initialDate: props.initialDate,
      locale: getCalendarLocale(),
      slotMinTime: '00:00:00',
      slotMaxTime: '24:00:00',
      slotLabelFormat: {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      },
      nowIndicator: true, // 显示当前时间指示器
      editable: true,
      selectable: true,
      selectMirror: true,
      dayMaxEvents: true,
      weekNumbers: true,
      weekNumberFormat: locale.value === 'en-US' ? { week: 'Week W' } : { week: '第W周' },
      navLinks: true,
      events: props.events,
      eventTimeFormat: {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      },
      // 禁用全天显示
      allDaySlot: false,
      // 自定义选择高亮颜色
      selectHighlight: {
        backgroundColor: 'transparent',
        borderColor: 'transparent'
      },
      dateClick: (info) => {
        emit('dateClick', info);
      },
      eventClick: (info) => {
        emit('eventClick', info);
      },
      eventsSet: (events) => {
        emit('eventsSet', events);
      },
      datesSet: (dateInfo) => {
        emit('datesSet', dateInfo);
      },
      eventContent: (arg) => {
        // 检查是否为月视图(dayGridMonth)
        const isMonthView = calendarInstance.value.view.type === 'dayGridMonth';
        
        if (isMonthView) {
          // 月视图下只显示时间和会议名称
          // 格式化时间为时:分
          const eventStart = new Date(arg.event.start);
          const timeStr = `${String(eventStart.getHours()).padStart(2, '0')}:${String(eventStart.getMinutes()).padStart(2, '0')}`;
          
          // 创建单行显示元素
          const contentEl = document.createElement('div');
          contentEl.innerHTML = `${timeStr} ${arg.event.title}`;
          contentEl.className = 'fc-event-content-month';
          contentEl.style.whiteSpace = 'nowrap';
          contentEl.style.overflow = 'hidden';
          contentEl.style.textOverflow = 'ellipsis';
          
          // 设置事件的背景色
          if (arg.el) {
            setTimeout(() => {
              const eventEl = arg.el.closest('.fc-event');
              if (eventEl) {
                eventEl.style.backgroundColor = '#E1EEFF';
                eventEl.style.borderColor = '#E1EEFF';
              }
            }, 0);
          }
          
          return { domNodes: [contentEl] };
        } else {
          // 其他视图保持原样，上下显示会议名称和会议室
          const titleEl = document.createElement('div');
          titleEl.innerHTML = arg.event.title;
          titleEl.className = 'fc-event-title';
          titleEl.style.fontWeight = 'bold';
          titleEl.style.marginBottom = '2px';
          
          const roomEl = document.createElement('div');
          roomEl.innerHTML = arg.event.extendedProps.room || (locale.value === 'en-US' ? 'No room specified' : '未指定会议室');
          roomEl.className = 'fc-event-room';
          roomEl.style.fontSize = '12px';
          
          // 创建一个容器元素
          const containerEl = document.createElement('div');
          containerEl.className = 'fc-event-container';
          containerEl.style.display = 'flex';
          containerEl.style.flexDirection = 'column';
          containerEl.style.width = '100%';
          
          containerEl.appendChild(titleEl);
          containerEl.appendChild(roomEl);
          
          return { domNodes: [containerEl] };
        }
      }
    });
    
    calendarInstance.value.render();
    
    // 立即通知父组件日历已准备好
    nextTick(() => {
      emit('calendarReady', calendarInstance.value);
    });
  }
};

const refetchEvents = () => {
  if (calendarInstance.value) {
    calendarInstance.value.refetchEvents();
  }
};

const gotoDate = (date) => {
  if (calendarInstance.value) {
    calendarInstance.value.gotoDate(date);
  }
};

// 增加一个刷新方法
const refresh = () => {
  calendarKey.value += 1;
  nextTick(() => {
    initCalendar();
  });
};

onMounted(() => {
  initCalendar();
});

onUnmounted(() => {
  if (calendarInstance.value) {
    calendarInstance.value.destroy();
    calendarInstance.value = null;
  }
});

// 监听forceRefresh属性变化
watch(() => props.forceRefresh, (newValue, oldValue) => {
  if (newValue !== oldValue && newValue === true) {
    // 递增key以强制DOM元素重新渲染
    calendarKey.value += 1;
    // 需要在下一个tick重新初始化日历
    nextTick(() => {
      initCalendar();
    });
  }
});

// 监听语言变化，重新初始化日历
watch(() => locale.value, () => {
  refresh();
});

watch(() => props.events, (newEvents) => {
  if (calendarInstance.value) {
    calendarInstance.value.getEventSources().forEach(source => source.remove());
    calendarInstance.value.addEventSource(newEvents);
  }
}, { deep: true });

// 暴露响应式的calendar实例
defineExpose({ 
  refetchEvents, 
  gotoDate, 
  refresh,
  get calendar() { return calendarInstance.value; } 
});
</script>

<style lang="stylus" scoped>
.calendar-container
  width 100%
  height 100%
  min-height 600px

.calendar-page
  padding 0 !important

.calendar
  width 100%
  height 100%

:deep(.fc-header-toolbar)
  margin-bottom 10px !important
  .fc-button
    width 32px
    height 32px
    border-radius 4px
    background-color #F2F3F5
    border none
    color #657085
    line-height: 32px
    font-size 16px
    font-weight 500
    display flex
    align-items center
    justify-content center
    .fc-icon
      font-size 15px
    &.fc-prev-button
      margin-right 10px
    &:active, &:focus
      background-color #F2F3F5 !important
      box-shadow none !important
      outline none !important
  .fc-today-button
    width: 56px;
    height: 34px;
    border-radius: 4px;
    background: #F1F3F5;
    font-family: Source Han Sans CN;
    font-weight: 400;
    font-size: 16px;
    color: #657085
    padding-left 0
    padding-right 0
    &[disabled]
      background: #FFFFFF !important
      opacity: 1 !important
      box-sizing: border-box;
      border: 4px solid #F1F3F5
  .fc-toolbar-chunk:last-child
    width 220px
    display flex
    align-items center
    justify-content space-between
    .fc-button-group
      min-width 150px
      height 34px
      button
        font-family: Source Han Sans CN;
        font-weight: 400;
        font-size: 16px;
        color: #707C8F
        height 34px
        &.fc-button-active
          border none
          background #F1F3F5
          &::before
            content attr(title)
            display block
            width: 37px;
            height: 26px;
            background: #FFFFFF;
            box-shadow: 0px 1px 3px 0px rgba(190,190,190,0.5);
            border-radius: 4px
            position: absolute;
            top: 4px
            left: 7.5px
            font-family: Source Han Sans CN;
            font-weight: 400;
            font-size: 16px;
            color: #707C8F;
            line-height: 26px;

          
          
:deep(.fc-day-today)
  background-color rgba(229, 242, 255, 0.4) !important
  .fc-daygrid-day-top
    .fc-daygrid-day-number
      width: 36px;
      height: 36px;
      background: linear-gradient(90deg, #269BFB, #1B76FB);
      border-radius: 50%
      font-family: Source Han Sans CN;
      font-weight: bold;
      font-size: 18px;
      color: #FFFFFF
      text-align center
  &.fc-col-header-cell
    color #1C7AFB
:deep(.fc-col-header-cell)
  font-weight normal

:deep(.fc-week-number)
  color #666
  font-size 12px
  padding-left 5px

:deep(.fc-event) {
  border-radius: 4px
  padding: 4px 6px
  overflow: hidden
  
  .fc-event-container {
    display: flex
    flex-direction: column
    width: 100%
  }
  
  .fc-event-title {
    font-weight: 500
    margin-bottom: 2px
    white-space: nowrap
    overflow: hidden
    text-overflow: ellipsis
  }
  
  .fc-event-room {
    white-space: nowrap
    overflow: hidden
    text-overflow: ellipsis
    font-family: Source Han Sans CN;
    font-weight: 400;
    font-size: 14px;
    color: #999999
  }
  
  .fc-event-content-month {
    font-size: 13px
    line-height: 1.3
    white-space: nowrap
    overflow: hidden
    text-overflow: ellipsis
    color: #333
  }
}

// 统一月视图和周视图中的事件样式
:deep(.fc-daygrid-event),
:deep(.fc-timegrid-event)
  background-color: #E1EEFF !important
  border-color: #E1EEFF !important
  color: #333 !important
  &::before
    content ''
    display block
    width 4px
    height 100%
    background rgb(28, 122, 251)
    position: absolute
    left 0
    top 0

// 确保周视图中的事件样式正确
:deep(.fc-timegrid-event)
  margin-left: 0 !important
  margin-right: 0 !important
  border-radius: 4px !important
  
  .fc-event-main
    padding: 4px 6px !important
    padding-left: 10px !important
    
  .fc-event-time
    display: inline-block !important
    font-weight: normal !important
    margin-right: 4px !important
  
  .fc-event-title
    display: inline-block !important
    font-family: Source Han Sans CN;
    font-weight: 400;
    font-size: 14px;
    color: #333333
:deep(.fc-toolbar-title)
  font-family: Source Han Sans CN;
  font-weight: 500;
  font-size: 20px;
  color: #333333

:deep(.fc-day-grid-event .fc-time)
  font-weight normal

:deep(.fc th), :deep(.fc td)
  border-width 1px !important
  border-color #ebeef5 !important

:deep(.fc-day-header)
  padding 8px 0 !important
:deep(th)
  background #E6E6E6
  line-height 40px
  font-family: Source Han Sans CN;
  font-weight: 500;
  font-size: 16px;
  color: #333333
// :deep(.fc-daygrid-week-number)
//   display none

:deep(.fc-timegrid-slot-label)
  font-size 12px
  color #666

:deep(.fc-timegrid-axis)
  width 60px !important

:deep(.fc-timegrid-slot)
  height 40px !important

// 自定义当前时间指示器样式
:deep(.fc-timegrid-now-indicator-line)
  border-color: #FA3F3F
  border-width: 1px

:deep(.fc-timegrid-now-indicator-arrow)
  display none

// 隐藏选择高亮效果
:deep(.fc-highlight)
  background-color: transparent !important
  border-color: transparent !important

// 去掉时间轴列的左边框和下边框及背景色
// :deep(.fc-timegrid-axis), :deep(.fc-timegrid-slot-label)
//   border-left: none !important
//   border-bottom: none !important
//   background-color: transparent !important

// :deep(.fc-timegrid-axis-frame)
//   background-color: transparent !important
:deep(.fc-scrollgrid.fc-scrollgrid-liquid)
  border none !important

.calendar-en
  :deep(.fc-toolbar-chunk:last-child)
    width 300px
    .fc-button-group
      min-width 150px
      height 34px
      border-radius 10px
      button
        width 50px
        &.fc-dayGridMonth-button
          width 70px
        &.fc-button-active
          width 120px
          &.fc-timeGridWeek-button
            width 106px
          &.fc-timeGridDay-button
            width 100px
          &::before
            content attr(title)
            display block
            width: auto;
            padding 0 10px;
            height: 26px;
            position: absolute;
            top: 4px
            left: 7.5px
</style> 