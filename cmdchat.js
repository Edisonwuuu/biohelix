'use strict'

function cmdchat(messages) {
  if (!Array.isArray(messages)) {
    messages = [messages]
  }

  messages.forEach(x => {
    try {
        fullResponse += JSON.parse(x.data).answer || '';
        if (this.mode === 'cmd') {
            console.log("mode", this.mode);
            if (fullResponse.trim().endsWith('}```')
                || fullResponse.endsWith('}')===0
                || fullResponse.trim().endsWith('}```')
                || fullResponse.trim().endsWith('}\n```')
            ) {
                return fullResponse;
            }
        } else if (this.mode === 'chat') {
            render(fullResponse);
        }

        if (!this.mode) {
            let trim_text = fullResponse.trim()

            if (trim_text.indexOf('```json') === 0
                || trim_text.indexOf('{') === 0
                || trim_text.indexOf('\n{') === 0
                || trim_text.indexOf('```\njson') === 0
            ) {
                this.mode = 'cmd';
            } else {
                if (trim_text.length > 10)
                    this.mode = 'chat';
            }
        } else {
            callback 
            && typeof callback === 'function' 
            && this.mode === 'chat'
            && callback(fullResponse);
        }
    } catch (err) {

    }

  })

}