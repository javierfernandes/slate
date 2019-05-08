/* eslint-disable */
import { Editor, getEventTransfer } from 'slate-react'
import { Value } from 'slate'

import React from 'react'
import initialValue from './value.json'
import isUrl from 'is-url'
import { Button, Icon, Toolbar } from '../components'

const schema = {
  document: {
    nodes: [{ match: { type: 'paragraph' } }],
  },
  blocks: {
    paragraph: {
      nodes: [
        {
          match: [{ object: 'text' }, { type: 'link' }],
        },
      ],
      // normalize: (editor, error) => {
      //   console.log('blocks.paragraph.normalize', JSON.stringify(error, null, 2))
      // }
    },
  },
  inlines: {
    link: {
      nodes: [
        {
          match: { object: 'text', text: /^\[.*\]$/ }
        }
      ],
      normalize: (editor, error) => {
        console.log('inlines.link.normalize', JSON.stringify(error, null, 2))
        if (error.code == 'child_text_invalid') {
          const key = error.node.key
          const text = editor.value.document.getNode(error.child.key).text
          
          editor.replaceNodeByKey(key, { object: 'text', text })
        }
      }
    },
  }
}

/**
 * A change helper to standardize wrapping links.
 *
 * @param {Editor} editor
 * @param {String} href
 */

function wrapLink(editor, href) {
  editor.wrapInline({
    type: 'link',
    data: { href },
  })

  editor.moveToEnd()
}

/**
 * A change helper to standardize unwrapping links.
 *
 * @param {Editor} editor
 */

function unwrapLink(editor) {
  editor.unwrapInline('link')
}

/**
 * The links example.
 *
 * @type {Component}
 */

class Links extends React.Component {
  /**
   * Deserialize the raw initial value.
   *
   * @type {Object}
   */

  state = {
    value: Value.fromJSON(initialValue),
  }

  /**
   * Check whether the current selection has a link in it.
   *
   * @return {Boolean} hasLinks
   */

  hasLinks = () => {
    const { value } = this.state
    return value.inlines.some(inline => inline.type === 'link')
  }

  /**
   * Store a reference to the `editor`.
   *
   * @param {Editor} editor
   */

  ref = editor => {
    this.editor = editor
  }

  /**
   * Render the app.
   *
   * @return {Element} element
   */

  render() {
    return (
      <div>
        <Toolbar>
          <Button active={this.hasLinks()} onMouseDown={this.onClickLink}>
            <Icon>link</Icon>
          </Button>
        </Toolbar>
        <Editor
          schema={schema}
          placeholder="Enter some text..."
          ref={this.ref}
          value={this.state.value}
          onChange={this.onChange}
          onPaste={this.onPaste}
          renderNode={this.renderNode}
        />
      </div>
    )
  }

  /**
   * Render a Slate node.
   *
   * @param {Object} props
   * @param {Editor} editor
   * @param {Function} next
   * @return {Element}
   */

  renderNode = (props, editor, next) => {
    const { attributes, children, node } = props

    switch (node.type) {
      case 'link': {
        const { data } = node
        const href = data.get('href')
        return (
          <a {...attributes} href={href}>
            {children}
          </a>
        )
      }

      default: {
        return next()
      }
    }
  }

  /**
   * On change.
   *
   * @param {Editor} editor
   */

  onChange = ({ value }) => {
    this.setState({ value })
  }

  /**
   * When clicking a link, if the selection has a link in it, remove the link.
   * Otherwise, add a new link with an href and text.
   *
   * @param {Event} event
   */

  onClickLink = event => {
    event.preventDefault()

    const { editor } = this
    const { value } = editor
    const hasLinks = this.hasLinks()

    if (hasLinks) {
      editor.command(unwrapLink)
    } else if (value.selection.isExpanded) {
      const href = window.prompt('Enter the URL of the link:')

      if (href == null) {
        return
      }

      editor.command(wrapLink, href)
    } else {
      const href = window.prompt('Enter the URL of the link:')

      if (href == null) {
        return
      }

      const text = window.prompt('Enter the text for the link:')

      if (text == null) {
        return
      }

      editor
        .insertText(text)
        .moveFocusBackward(text.length)
        .command(wrapLink, href)
    }
  }

  /**
   * On paste, if the text is a link, wrap the selection in a link.
   *
   * @param {Event} event
   * @param {Editor} editor
   * @param {Function} next
   */

  onPaste = (event, editor, next) => {
    if (editor.value.selection.isCollapsed) return next()

    const transfer = getEventTransfer(event)
    const { type, text } = transfer
    if (type !== 'text' && type !== 'html') return next()
    if (!isUrl(text)) return next()

    if (this.hasLinks()) {
      editor.command(unwrapLink)
    }

    editor.command(wrapLink, text)
  }
}

/**
 * Export.
 */

export default Links
